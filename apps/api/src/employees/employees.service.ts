import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Employee, Prisma } from '@prisma/client';
import type { EmployeeView, Paginated } from '@peoplelens/types';
import { type AuditService } from '@app/audit/audit.service';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { type RbacService } from '@app/common/services/rbac.service';
import { type PrismaService } from '@app/database/prisma.service';
import { type CreateEmployeeDto } from './dto/create-employee.dto';
import { type QueryEmployeesDto } from './dto/query-employees.dto';
import { type UpdateEmployeeDto } from './dto/update-employee.dto';

/**
 * Employee management — the workforce core domain.
 *
 * RBAC: admins see everything and can write; managers can write but only
 * within their assigned departments; viewers read everything but never write.
 * Listing is department-scoped for managers. Deletion is a soft delete.
 */
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: RequestUser, query: QueryEmployeesDto): Promise<Paginated<EmployeeView>> {
    const {
      page,
      pageSize,
      search,
      departmentId,
      teamId,
      status,
      gender,
      sortBy,
      sortOrder,
      includeDeleted,
    } = query;
    const scope = await this.rbac.departmentScope(actor);

    const where: Prisma.EmployeeWhereInput = {
      // Soft-deleted records are hidden by default; `includeDeleted` reveals
      // them so admins/managers can audit and restore removed employees.
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(scope ? { departmentId: { in: scope } } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(teamId ? { teamId } : {}),
      ...(status ? { status } : {}),
      ...(gender ? { gender } : {}),
      ...(search ? this.buildSearch(search) : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: this.employeeInclude,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      items: items.map((e) => this.toView(e)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get one employee — INCLUDING soft-deleted records.
   *
   * Deliberately wider than the list/update paths: audit-log entries and
   * restore workflows link here, and a soft-deleted employee must still be
   * viewable (with its `deletedAt`) so the profile renders a restore banner
   * instead of a dead 404. RBAC scoping still applies to managers.
   */
  async findOne(actor: RequestUser, id: string): Promise<EmployeeView> {
    const employee = await this.prisma.employee.findFirst({
      where: { id },
      include: this.employeeInclude,
    });
    if (!employee) throw new NotFoundException('Employee not found');
    if (actor && !this.rbac.isAdmin(actor)) {
      const scope = await this.rbac.departmentScope(actor);
      if (scope && !scope.includes(employee.departmentId)) {
        throw new NotFoundException('Employee not found');
      }
    }
    return this.toView(employee);
  }

  async create(actor: RequestUser, dto: CreateEmployeeDto, ip?: string): Promise<EmployeeView> {
    await this.rbac.assertCanWrite(actor, dto.departmentId);
    await this.validateReferences(dto, dto.departmentId);
    await this.ensureUnique(dto.employeeCode, dto.email);

    const employee = await this.prisma.employee.create({
      data: {
        employeeCode: dto.employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        phone: dto.phone ?? null,
        jobTitle: dto.jobTitle,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ?? null,
        hiredAt: dto.hiredAt,
        status: dto.status ?? 'active',
        departmentId: dto.departmentId,
        teamId: dto.teamId ?? null,
        managerId: dto.managerId ?? null,
      },
      include: this.employeeInclude,
    });

    await this.audit.record(
      actor.sub,
      'create',
      'employee',
      employee.id,
      { email: employee.email } as Prisma.InputJsonValue,
      ip,
    );
    return this.toView(employee);
  }

  async update(
    actor: RequestUser,
    id: string,
    dto: UpdateEmployeeDto,
    ip?: string,
  ): Promise<EmployeeView> {
    const existing = await this.requireEmployee(id);
    const departmentId = dto.departmentId ?? existing.departmentId;
    await this.rbac.assertCanWrite(actor, departmentId);

    if (dto.employeeCode && dto.employeeCode !== existing.employeeCode) {
      await this.ensureUnique(dto.employeeCode, undefined, id);
    }
    if (dto.email && dto.email.toLowerCase() !== existing.email) {
      await this.ensureUnique(undefined, dto.email, id);
    }
    await this.validateReferences(dto, departmentId, existing.teamId);
    if (dto.managerId === id) {
      throw new BadRequestException('An employee cannot be their own manager');
    }

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.employeeCode !== undefined && { employeeCode: dto.employeeCode }),
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email.toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone ?? null }),
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.dateOfBirth !== undefined && { dateOfBirth: dto.dateOfBirth ?? null }),
        ...(dto.hiredAt !== undefined && { hiredAt: dto.hiredAt }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.departmentId !== undefined && { departmentId: dto.departmentId }),
        ...(dto.teamId !== undefined && { teamId: dto.teamId ?? null }),
        ...(dto.managerId !== undefined && { managerId: dto.managerId ?? null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: this.employeeInclude,
    });

    await this.audit.record(
      actor.sub,
      'update',
      'employee',
      id,
      { changes: dto } as unknown as Prisma.InputJsonValue,
      ip,
    );
    return this.toView(employee);
  }

  /** Soft-delete an employee — the record stays in history/audit/dashboard data. */
  async remove(
    actor: RequestUser,
    id: string,
    ip?: string,
  ): Promise<{ id: string; deleted: true }> {
    const existing = await this.requireEmployee(id);
    await this.rbac.assertCanWrite(actor, existing.departmentId);

    await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record(
      actor.sub,
      'delete',
      'employee',
      id,
      { email: existing.email } as Prisma.InputJsonValue,
      ip,
    );
    return { id, deleted: true };
  }

  /**
   * Restore a soft-deleted employee — reverses `remove()` and brings the
   * record back into active view with its org placement intact.
   *
   * Only a record that is actually deleted can be restored (404 otherwise).
   * Uniqueness is re-checked against *active* records because `ensureUnique`
   * guards creation, not restoration: if a newer employee was created with the
   * same email/code while this record was deleted, restoring would violate the
   * unique index — surface that as a clear conflict instead of a 500.
   */
  async restore(actor: RequestUser, id: string, ip?: string): Promise<EmployeeView> {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: { not: null } },
      include: this.employeeInclude,
    });
    if (!employee) throw new NotFoundException('Employee not found or not deleted');
    await this.rbac.assertCanWrite(actor, employee.departmentId);

    try {
      await this.ensureUnique(employee.employeeCode, employee.email, id);
    } catch (error) {
      // ensureUnique's generic "already exists" message reads oddly on a
      // restore — rethrow with a restore-specific explanation.
      if (error instanceof ConflictException) {
        throw new ConflictException(
          'Cannot restore: an active employee already uses this email or employee code',
        );
      }
      throw error;
    }

    const restored = await this.prisma.employee.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
      include: this.employeeInclude,
    });

    await this.audit.record(
      actor.sub,
      'restore',
      'employee',
      id,
      {
        email: employee.email,
        deletedAt: employee.deletedAt?.toISOString(),
      } as Prisma.InputJsonValue,
      ip,
    );
    return this.toView(restored);
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private buildSearch(search: string): Prisma.EmployeeWhereInput {
    const term = search.trim();
    if (!term) return {};
    return {
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { employeeCode: { contains: term, mode: 'insensitive' } },
        { jobTitle: { contains: term, mode: 'insensitive' } },
      ],
    };
  }

  private async requireEmployee(id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: this.employeeInclude,
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  /**
   * Uniqueness check for employee code / email.
   *
   * NOTE: soft-deleted rows are deliberately included. The database unique
   * indexes are global (not partial), so a deleted employee still occupies
   * its email/code. Excluding them here would let an insert pass validation
   * and then blow up on the raw Prisma unique-constraint error — a 500 with
   * no friendly message. Checking across ALL records (deleted or not) keeps
   * the API honest and guarantees `restore` never collides either.
   */
  private async ensureUnique(
    employeeCode?: string,
    email?: string,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.EmployeeWhereInput = {
      NOT: excludeId ? { id: excludeId } : undefined,
    };
    const conflicts = await this.prisma.employee.findMany({
      where: {
        OR: [
          ...(employeeCode ? [{ employeeCode }] : []),
          ...(email ? [{ email: email.toLowerCase() }] : []),
        ],
        ...where,
      },
      select: { employeeCode: true, email: true },
    });
    const c = conflicts[0];
    if (c) {
      if (c.employeeCode === employeeCode) {
        throw new ConflictException(`Employee code "${employeeCode}" already exists`);
      }
      if (c.email === email?.toLowerCase()) {
        throw new ConflictException(`An employee with email "${email}" already exists`);
      }
      throw new ConflictException('Employee code or email already exists');
    }
  }

  private async validateReferences(
    dto: CreateEmployeeDto | UpdateEmployeeDto,
    departmentId: string,
    existingTeamId?: string | null,
  ): Promise<void> {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, deletedAt: null },
    });
    if (!department) throw new BadRequestException('Department not found');

    // Enforce team↔department consistency ONLY when this update actually
    // changes the department or the team: if the department moves, an
    // unchanged team must belong to the new department; if the team changes,
    // it must belong to the (possibly new) department. Pre-existing
    // mismatches (e.g. legacy seed data) must never lock an employee out of
    // updates to unrelated fields.
    const teamId = dto.teamId ?? (dto.departmentId !== undefined ? existingTeamId : undefined);
    if (teamId) {
      const team = await this.prisma.team.findFirst({
        where: { id: teamId, departmentId, deletedAt: null },
      });
      if (!team) throw new BadRequestException('Team not found in the given department');
    }
    if (dto.managerId) {
      const manager = await this.prisma.employee.findFirst({
        where: { id: dto.managerId, deletedAt: null },
      });
      if (!manager) throw new BadRequestException('Manager employee not found');
    }
  }

  private readonly employeeInclude = {
    department: { select: { id: true, name: true } },
    team: { select: { id: true, name: true } },
    manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  } as const;

  private toView(
    e: Employee & {
      department?: { id: string; name: string } | null;
      team?: { id: string; name: string } | null;
      manager?: { id: string; firstName: string; lastName: string; email: string } | null;
    },
  ): EmployeeView {
    return {
      id: e.id,
      employeeCode: e.employeeCode,
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone,
      jobTitle: e.jobTitle,
      gender: e.gender,
      dateOfBirth: e.dateOfBirth?.toISOString() ?? null,
      hiredAt: e.hiredAt.toISOString(),
      status: e.status,
      isActive: e.isActive,
      departmentId: e.departmentId,
      teamId: e.teamId,
      managerId: e.managerId,
      userId: e.userId,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      deletedAt: e.deletedAt?.toISOString() ?? null,
      department: e.department ? { id: e.department.id, name: e.department.name } : null,
      team: e.team ? { id: e.team.id, name: e.team.name } : null,
      manager: e.manager
        ? {
            id: e.manager.id,
            firstName: e.manager.firstName,
            lastName: e.manager.lastName,
            email: e.manager.email,
          }
        : null,
    };
  }
}
