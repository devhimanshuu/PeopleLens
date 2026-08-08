import { Injectable } from '@nestjs/common';
import type { DashboardOverview, DistributionSlice, EmployeeView } from '@peoplelens/types';
import type { Employee, Prisma } from '@prisma/client';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { type RbacService } from '@app/common/services/rbac.service';
import { type PrismaService } from '@app/database/prisma.service';

/**
 * Initial analytics dashboard.
 *
 * Aggregates headcount KPIs and distribution slices (department, status,
 * gender) plus recent hires. Managers see their own departments only; admins
 * and viewers see the whole organization.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbac: RbacService,
  ) {}

  async getOverview(actor: RequestUser): Promise<DashboardOverview> {
    const scope = await this.rbac.departmentScope(actor);
    const where: Prisma.EmployeeWhereInput = {
      deletedAt: null,
      ...(scope ? { departmentId: { in: scope } } : {}),
    };
    const orgWhere: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(scope ? { id: { in: scope } } : {}),
    };

    const [totalEmployees, activeEmployees, totalDepartments, totalManagers, totalTeams] =
      await Promise.all([
        this.prisma.employee.count({ where }),
        this.prisma.employee.count({ where: { ...where, status: 'active' } }),
        this.prisma.department.count({ where: orgWhere }),
        this.countDepartmentManagers(orgWhere),
        this.prisma.team.count({
          where: { deletedAt: null, department: scope ? { id: { in: scope } } : {} },
        }),
      ]);

    const [departments, departmentDistribution, employeeStatus, genderDistribution, recentHires] =
      await Promise.all([
        this.prisma.department.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
        }),
        this.groupEmployees(this.prisma, where, 'departmentId'),
        this.groupEmployees(this.prisma, where, 'status'),
        this.groupEmployees(this.prisma, where, 'gender'),
        this.prisma.employee.findMany({
          where,
          orderBy: { hiredAt: 'desc' },
          take: 6,
          include: {
            department: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } },
            manager: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
      ]);

    const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));

    return {
      kpis: {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        totalManagers,
        totalTeams,
      },
      departmentDistribution: departmentDistribution.map((slice) => ({
        ...slice,
        name: departmentNameById.get(slice.name) ?? 'Unassigned',
      })),
      employeeStatus,
      genderDistribution,
      recentHires: recentHires.map((e) => this.toEmployeeView(e)),
    };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  /**
   * Distinct department managers WITHIN scope. Counting manager *accounts*
   * globally would leak org size to scoped managers and disagree with the
   * department-scoped numbers around it.
   */
  private async countDepartmentManagers(orgWhere: Prisma.DepartmentWhereInput): Promise<number> {
    const rows = await this.prisma.department.findMany({
      where: { ...orgWhere, managerUserId: { not: null } },
      select: { managerUserId: true },
      distinct: ['managerUserId'],
    });
    return rows.length;
  }

  private async groupEmployees(
    prisma: PrismaService,
    where: Prisma.EmployeeWhereInput,
    field: 'departmentId' | 'status' | 'gender',
  ): Promise<DistributionSlice[]> {
    const rows = await prisma.employee.groupBy({ by: [field], where, _count: { _all: true } });
    return rows
      .map((row) => ({
        name: this.humanize(field, row[field] as string | null),
        value: row._count._all,
      }))
      .sort((a, b) => b.value - a.value);
  }

  private humanize(field: 'departmentId' | 'status' | 'gender', value: string | null): string {
    if (field === 'departmentId') return value ?? 'Unassigned';
    return value
      ? value
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ')
      : 'Unknown';
  }

  private toEmployeeView(
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
