import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AuditService } from '@app/audit/audit.service';
import type { PrismaService } from '@app/database/prisma.service';
import type { RbacService } from '@app/common/services/rbac.service';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { Role } from '@app/common/enums/role.enum';
import { EmployeesService } from './employees.service';
import type { CreateEmployeeDto } from './dto/create-employee.dto';

const actor = (role: Role = Role.ADMIN): RequestUser => ({
  sub: 'user-1',
  email: 'admin@peoplelens.com',
  roles: [role],
});

/** One Prisma employee row in the shape `toView` consumes. */
interface EmployeeRowShape {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: null;
  jobTitle: string;
  gender: string;
  dateOfBirth: null;
  hiredAt: Date;
  status: string;
  isActive: boolean;
  departmentId: string;
  teamId: null;
  managerId: null;
  userId: null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
  department: { id: string; name: string } | null;
  team: null;
  manager: null;
}

function employeeRow(overrides: Partial<EmployeeRowShape> = {}): EmployeeRowShape {
  return {
    id: 'emp-1',
    employeeCode: 'EMP-0001',
    firstName: 'Alex',
    lastName: 'Morgan',
    email: 'alex@peoplelens.com',
    phone: null,
    jobTitle: 'Engineer',
    gender: 'female',
    dateOfBirth: null,
    hiredAt: new Date('2023-01-01'),
    status: 'active',
    isActive: false,
    departmentId: 'dept-1',
    teamId: null,
    managerId: null,
    userId: null,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    deletedAt: new Date('2025-01-01'),
    department: { id: 'dept-1', name: 'Engineering' },
    team: null,
    manager: null,
    ...overrides,
  };
}

/** Minimal mocks — only the Prisma/RBAC/audit surface EmployeesService touches. */
function createMocks() {
  const prisma = {
    employee: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    department: { findFirst: jest.fn() },
    team: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  };
  const rbac = {
    assertCanWrite: jest.fn().mockResolvedValue(undefined),
    departmentScope: jest.fn().mockResolvedValue(null),
    isAdmin: jest.fn().mockReturnValue(true),
    isManager: jest.fn().mockReturnValue(false),
    canWrite: jest.fn().mockReturnValue(true),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  return { prisma, rbac, audit };
}

describe('EmployeesService', () => {
  let mocks: ReturnType<typeof createMocks>;
  let service: EmployeesService;

  beforeEach(() => {
    mocks = createMocks();
    service = new EmployeesService(
      mocks.prisma as unknown as PrismaService,
      mocks.rbac as unknown as RbacService,
      mocks.audit as unknown as AuditService,
    );
  });

  describe('restore', () => {
    it('returns 404 when the employee does not exist or is not deleted', async () => {
      mocks.prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.restore(actor(), 'emp-missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      // The lookup must target only soft-deleted rows.
      expect(mocks.prisma.employee.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'emp-missing', deletedAt: { not: null } } }),
      );
    });

    it('rejects out-of-scope managers (RBAC) before mutating anything', async () => {
      mocks.prisma.employee.findFirst.mockResolvedValue(employeeRow());
      mocks.rbac.assertCanWrite.mockRejectedValue(new ForbiddenException('scope'));

      await expect(service.restore(actor(Role.MANAGER), 'emp-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(mocks.prisma.employee.update).not.toHaveBeenCalled();
      expect(mocks.audit.record).not.toHaveBeenCalled();
    });

    it('clears deletedAt, reactivates, and audits action "restore"', async () => {
      const row = employeeRow();
      mocks.prisma.employee.findFirst.mockResolvedValue(row);
      mocks.prisma.employee.findMany.mockResolvedValue([]); // uniqueness: no conflicts
      mocks.prisma.employee.update.mockResolvedValue({ ...row, deletedAt: null, isActive: true });

      const result = await service.restore(actor(), 'emp-1', '127.0.0.1');

      expect(mocks.prisma.employee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: { deletedAt: null, isActive: true },
        include: expect.anything(),
      });
      expect(result.deletedAt).toBeNull();
      expect(result.isActive).toBe(true);
      expect(mocks.audit.record).toHaveBeenCalledWith(
        'user-1',
        'restore',
        'employee',
        'emp-1',
        expect.anything(),
        '127.0.0.1',
      );
    });

    it('fails with a restore-specific message when email/code is now taken', async () => {
      mocks.prisma.employee.findFirst.mockResolvedValue(employeeRow());
      mocks.prisma.employee.findMany.mockResolvedValue([
        { employeeCode: 'EMP-0001', email: 'other@peoplelens.com' },
      ]);

      await expect(service.restore(actor(), 'emp-1')).rejects.toThrow(/cannot restore/i);
      expect(mocks.prisma.employee.update).not.toHaveBeenCalled();
    });
  });

  describe('ensureUnique across soft-deleted rows', () => {
    it('blocks creating an employee whose email is held by a deleted record (no raw P2002 500)', async () => {
      mocks.prisma.employee.findMany.mockResolvedValue([
        { employeeCode: 'EMP-0001', email: 'alex@peoplelens.com' },
      ]);
      mocks.prisma.department.findFirst.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });

      const dto = {
        employeeCode: 'EMP-0002',
        firstName: 'New',
        lastName: 'Hire',
        email: 'alex@peoplelens.com',
        jobTitle: 'Engineer',
        gender: 'female',
        hiredAt: new Date('2024-01-01'),
        departmentId: 'dept-1',
      } as CreateEmployeeDto;

      await expect(service.create(actor(), dto)).rejects.toBeInstanceOf(ConflictException);
      expect(mocks.prisma.employee.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns soft-deleted employees so audit-log / restore links land on a profile', async () => {
      mocks.prisma.employee.findFirst.mockResolvedValue(employeeRow());

      const result = await service.findOne(actor(), 'emp-1');

      expect(result.id).toBe('emp-1');
      expect(result.deletedAt).toBe('2025-01-01T00:00:00.000Z');
      // Must NOT filter on deletedAt — deleted profiles stay viewable.
      expect(mocks.prisma.employee.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'emp-1' } }),
      );
    });

    it('still 404s for unknown ids', async () => {
      mocks.prisma.employee.findFirst.mockResolvedValue(null);

      await expect(service.findOne(actor(), 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAll with includeDeleted', () => {
    const row = employeeRow();

    beforeEach(() => {
      mocks.prisma.$transaction.mockResolvedValue([[row], 1]);
    });

    it('filters deletedAt: null by default', async () => {
      await service.findAll(actor(), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
      });

      expect(mocks.prisma.employee.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
      );
    });

    it('drops the deletedAt filter when includeDeleted is true', async () => {
      await service.findAll(actor(), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
        includeDeleted: true,
      });

      const where = mocks.prisma.employee.findMany.mock.calls[0]![0]!.where as Record<
        string,
        unknown
      >;
      expect(where.deletedAt).toBeUndefined();
    });

    it('ignores includeDeleted for viewers — deleted rows stay hidden', async () => {
      mocks.rbac.canWrite.mockReturnValue(false);
      await service.findAll(actor(Role.VIEWER), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
        includeDeleted: true,
      });

      const where = mocks.prisma.employee.findMany.mock.calls[0]![0]!.where as Record<
        string,
        unknown
      >;
      // A viewer must never be able to reveal soft-deleted records.
      expect(where.deletedAt).toBeNull();
    });

    it("never lets a manager's departmentId filter widen the scope (IDOR guard)", async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.departmentScope.mockResolvedValue(['dept-A']);
      await service.findAll(actor(Role.MANAGER), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
        departmentId: 'dept-B',
      });

      const where = mocks.prisma.employee.findMany.mock.calls[0]![0]!.where as Record<
        string,
        unknown
      >;
      // An out-of-scope department id must match NOTHING — never a bare id
      // that would overwrite the scope constraint.
      expect(where.departmentId).toEqual({ in: [] });
    });

    it('narrows to an in-scope departmentId for managers', async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.departmentScope.mockResolvedValue(['dept-A', 'dept-B']);
      await service.findAll(actor(Role.MANAGER), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
        departmentId: 'dept-B',
      });

      const where = mocks.prisma.employee.findMany.mock.calls[0]![0]!.where as Record<
        string,
        unknown
      >;
      expect(where.departmentId).toBe('dept-B');
    });

    it('a manager with an EMPTY scope gets zero results even with a departmentId filter', async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.departmentScope.mockResolvedValue([]);
      await service.findAll(actor(Role.MANAGER), {
        page: 1,
        pageSize: 20,
        sortBy: 'hiredAt',
        sortOrder: 'desc',
        departmentId: 'dept-B',
      });

      const where = mocks.prisma.employee.findMany.mock.calls[0]![0]!.where as Record<
        string,
        unknown
      >;
      expect(where.departmentId).toEqual({ in: [] });
    });
  });

  describe('findOne — viewer guard on soft-deleted records', () => {
    it('returns a 404 when a viewer requests a soft-deleted employee', async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.canWrite.mockReturnValue(false);
      mocks.prisma.employee.findFirst.mockResolvedValue(employeeRow());

      await expect(service.findOne(actor(Role.VIEWER), 'emp-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('admins and managers may still view deleted profiles (restore workflow)', async () => {
      mocks.rbac.canWrite.mockReturnValue(true);
      mocks.prisma.employee.findFirst.mockResolvedValue(employeeRow());

      await expect(service.findOne(actor(), 'emp-1')).resolves.toMatchObject({ id: 'emp-1' });
      await expect(service.findOne(actor(Role.MANAGER), 'emp-1')).resolves.toMatchObject({
        id: 'emp-1',
      });
    });
  });

  describe('create — manager reference stays in scope', () => {
    it('rejects a manager assigning an out-of-scope manager employee', async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.isManager.mockReturnValue(true);
      mocks.rbac.departmentScope.mockResolvedValue(['dept-1']);
      mocks.prisma.department.findFirst.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });
      // The referenced manager belongs to dept-9 — outside the actor's scope.
      mocks.prisma.employee.findFirst.mockResolvedValue({
        id: 'manager-9',
        departmentId: 'dept-9',
      });

      const dto = {
        employeeCode: 'EMP-0099',
        firstName: 'New',
        lastName: 'Hire',
        email: 'hire@peoplelens.com',
        jobTitle: 'Engineer',
        gender: 'female',
        hiredAt: new Date('2024-01-01'),
        departmentId: 'dept-1',
        managerId: 'manager-9',
      } as CreateEmployeeDto;

      await expect(service.create(actor(Role.MANAGER), dto)).rejects.toThrow(
        /outside your assigned departments/,
      );
      expect(mocks.prisma.employee.create).not.toHaveBeenCalled();
    });

    it('allows a manager referencing an in-scope manager employee', async () => {
      mocks.rbac.isAdmin.mockReturnValue(false);
      mocks.rbac.isManager.mockReturnValue(true);
      mocks.rbac.departmentScope.mockResolvedValue(['dept-1']);
      mocks.prisma.department.findFirst.mockResolvedValue({ id: 'dept-1', name: 'Engineering' });
      mocks.prisma.employee.findFirst.mockResolvedValue({
        id: 'manager-1',
        departmentId: 'dept-1',
      });
      mocks.prisma.employee.findMany.mockResolvedValue([]); // uniqueness: clean
      mocks.prisma.employee.create.mockResolvedValue(employeeRow());

      const dto = {
        employeeCode: 'EMP-0100',
        firstName: 'New',
        lastName: 'Hire',
        email: 'hire2@peoplelens.com',
        jobTitle: 'Engineer',
        gender: 'female',
        hiredAt: new Date('2024-01-01'),
        departmentId: 'dept-1',
        managerId: 'manager-1',
      } as CreateEmployeeDto;

      await expect(service.create(actor(Role.MANAGER), dto)).resolves.toBeDefined();
      expect(mocks.prisma.employee.create).toHaveBeenCalledTimes(1);
    });
  });
});
