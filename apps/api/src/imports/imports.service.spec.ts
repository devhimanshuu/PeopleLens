import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ImportHistory } from '@prisma/client';
import { type AuditService } from '@app/audit/audit.service';
import { type RbacService } from '@app/common/services/rbac.service';
import { type PrismaService } from '@app/database/prisma.service';
import { type CsvService, type ParsedRow } from './csv.service';
import { ImportsService } from './imports.service';

/**
 * ImportsService pipeline tests — the riskiest CSV logic:
 * file-type gates, RBAC, reference resolution (department/team/manager by
 * name), duplicate detection (database + within-file), row filtering by error
 * stage, transactional insert, and the ImportHistory record.
 */

const ACTOR = { sub: 'user-1', email: 'admin@peoplelens.dev', roles: ['admin'] } as never;

const FILE = {
  fieldname: 'file',
  originalname: 'employees.csv',
  mimetype: 'text/csv',
  buffer: Buffer.from('a,b,c\n1,2,3\n'),
  size: 10,
} as Express.Multer.File;

interface Mocks {
  prisma: {
    employee: {
      findMany: jest.Mock;
      create: jest.Mock;
    };
    department: { findMany: jest.Mock };
    team: { findMany: jest.Mock };
    importHistory: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  csv: { parse: jest.Mock };
  rbac: { canWrite: jest.Mock; departmentScope: jest.Mock };
  audit: { record: jest.Mock };
}

function createMocks(): Mocks {
  const prisma = {
    employee: { findMany: jest.fn(), create: jest.fn() },
    department: { findMany: jest.fn() },
    team: { findMany: jest.fn() },
    importHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  };
  return {
    prisma,
    csv: { parse: jest.fn() },
    rbac: {
      canWrite: jest.fn().mockReturnValue(true),
      departmentScope: jest.fn().mockResolvedValue(null),
    },
    audit: { record: jest.fn().mockResolvedValue(undefined) },
  };
}

function row(overrides: Partial<ParsedRow['data']> = {}, errors: string[] = []): ParsedRow {
  return {
    data: {
      employeeCode: 'EMP-1',
      firstName: 'Alex',
      lastName: 'Morgan',
      email: 'alex@company.com',
      phone: undefined,
      jobTitle: 'Engineer',
      gender: 'female',
      dateOfBirth: undefined,
      hiredAt: '2023-06-01',
      status: 'active',
      department: 'Engineering',
      team: 'Platform',
      managerEmail: 'taylor@company.com',
      ...overrides,
    },
    rowNumber: 2,
    errors,
  };
}

function historyRow(overrides: Partial<ImportHistory> = {}): ImportHistory {
  return {
    id: 'hist-1',
    fileName: 'employees.csv',
    status: 'completed',
    totalRows: 1,
    successCount: 1,
    failedCount: 0,
    duplicateCount: 0,
    errorReport: null,
    importedByUserId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  } as ImportHistory;
}

/**
 * Mock `employee.findMany` for BOTH pipeline calls:
 *  - call 1 (resolveReferences) selects `{ id, email }` — manager lookup;
 *  - call 2 (detectDuplicates) selects only `{ employeeCode }` or `{ email }`.
 * The two shapes are distinguished by the presence of `email` in `select`.
 */
/** Creates the ImportHistory row the service reads back after the insert. */
function mockHistoryCreate(mocks: Mocks, overrides: Partial<ImportHistory> = {}): void {
  mocks.prisma.importHistory.create.mockImplementation(
    ({ data }: { data: Partial<ImportHistory> }) =>
      Promise.resolve(
        historyRow({
          fileName: data.fileName,
          status: data.status,
          totalRows: data.totalRows,
          successCount: data.successCount,
          failedCount: data.failedCount,
          duplicateCount: data.duplicateCount,
          // Default to whatever the service wrote (incl. its error report); an
          // explicit override always wins.
          ...overrides,
          errorReport:
            overrides.errorReport === undefined
              ? (data.errorReport as ImportHistory['errorReport'])
              : overrides.errorReport,
        }),
      ),
  );
}

const ENGINEERING_TEAMS = [
  {
    id: 'team-1',
    name: 'Platform',
    departmentId: 'dept-1',
    department: { id: 'dept-1', name: 'Engineering' },
  },
];

/** Row helper without a team reference — for tests that only exercise departments. */
function rowNoTeam(overrides: Partial<ParsedRow['data']> = {}, errors: string[] = []): ParsedRow {
  return row({ team: undefined, managerEmail: undefined, ...overrides }, errors);
}

function mockEmployeeFindMany(
  mocks: Mocks,
  managers: Array<{ id: string; email: string }> = [
    { id: 'manager-1', email: 'taylor@company.com' },
  ],
  dbDupes: Array<{ employeeCode?: string; email?: string }> = [],
): void {
  mocks.prisma.employee.findMany.mockImplementation((args: { select?: unknown; where?: unknown }) =>
    Promise.resolve(
      args.select && 'email' in (args.select as Record<string, unknown>)
        ? managers.filter((m) =>
            (args.where as { email?: { in?: string[] } })?.email?.in?.some(
              (e) => e.toLowerCase() === m.email,
            ),
          )
        : dbDupes,
    ),
  );
}

describe('ImportsService', () => {
  let service: ImportsService;
  let mocks: Mocks;

  beforeEach(() => {
    mocks = createMocks();
    service = new ImportsService(
      mocks.prisma as unknown as PrismaService,
      mocks.csv as unknown as CsvService,
      mocks.rbac as unknown as RbacService,
      mocks.audit as unknown as AuditService,
    );
  });

  describe('importCsv — gates', () => {
    it('rejects a missing file', async () => {
      await expect(service.importCsv(ACTOR, undefined as never)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a non-CSV file type', async () => {
      const exe = { ...FILE, mimetype: 'application/x-msdownload', originalname: 'malware.exe' };
      await expect(service.importCsv(ACTOR, exe)).rejects.toThrow('Only CSV files are supported');
    });

    it('rejects viewers with 403 (not 400)', async () => {
      mocks.rbac.canWrite.mockReturnValue(false);
      await expect(service.importCsv(ACTOR, FILE)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('importCsv — pipeline', () => {
    it('inserts valid rows and records import history with zero errors', async () => {
      const rows = [row()];
      mocks.csv.parse.mockReturnValue({ rows, errorReport: [] });
      mocks.prisma.department.findMany.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);
      mocks.prisma.team.findMany.mockResolvedValue([
        { id: 'team-1', name: 'Platform', departmentId: 'dept-1' },
      ]);
      mocks.prisma.team.findMany.mockResolvedValue(ENGINEERING_TEAMS);
      mockEmployeeFindMany(mocks); // manager found + no DB dupes
      mocks.prisma.employee.create.mockResolvedValue({ id: 'emp-1' });
      mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) =>
        fn(mocks.prisma),
      );
      mockHistoryCreate(mocks, { status: 'completed', successCount: 1, totalRows: 1 });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).toHaveBeenCalledTimes(1);
      expect(mocks.prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'Alex',
            departmentId: 'dept-1',
            teamId: 'team-1',
            managerId: 'manager-1',
          }),
        }),
      );
      expect(mocks.prisma.importHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed', successCount: 1, failedCount: 0 }),
        }),
      );
      expect(mocks.audit.record).toHaveBeenCalledWith(
        'user-1',
        'import',
        'import',
        'hist-1',
        expect.any(Object),
        undefined,
      );
      expect(result.status).toBe('completed');
    });

    it('skips DB duplicates and reports them without inserting', async () => {
      const rows = [rowNoTeam(), rowNoTeam({ employeeCode: 'EMP-2', email: 'b@company.com' })];
      mocks.csv.parse.mockReturnValue({ rows, errorReport: [] });
      mocks.prisma.department.findMany.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);
      mocks.prisma.team.findMany.mockResolvedValue([]);
      // DB already has EMP-1 → row 1 is a duplicate; EMP-2 is clean.
      mockEmployeeFindMany(mocks, [], [{ employeeCode: 'EMP-1' }]);
      mocks.prisma.employee.create.mockResolvedValue({ id: 'emp-2' });
      mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) =>
        fn(mocks.prisma),
      );
      mockHistoryCreate(mocks, {
        status: 'partial',
        successCount: 1,
        failedCount: 1,
        duplicateCount: 1,
      });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).toHaveBeenCalledTimes(1);
      expect(mocks.prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ employeeCode: 'EMP-2' }) }),
      );
      expect(result.status).toBe('partial');
      expect(result.duplicateCount).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('flags within-file duplicate rows and only inserts the first', async () => {
      const rows = [
        rowNoTeam(),
        rowNoTeam({ email: 'b@company.com', employeeCode: 'EMP-2' }),
        rowNoTeam(),
      ];
      mocks.csv.parse.mockReturnValue({ rows, errorReport: [] });
      mocks.prisma.department.findMany.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);
      mocks.prisma.team.findMany.mockResolvedValue([]);
      mockEmployeeFindMany(mocks);
      mocks.prisma.employee.create.mockResolvedValue({ id: 'emp-x' });
      mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) =>
        fn(mocks.prisma),
      );
      mockHistoryCreate(mocks, {
        status: 'partial',
        successCount: 2,
        failedCount: 1,
        duplicateCount: 1,
      });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).toHaveBeenCalledTimes(2);
      expect(result.status).toBe('partial');
      expect(result.duplicateCount).toBe(1);
    });

    it('keeps a row out when a referenced department is missing', async () => {
      const rows = [rowNoTeam({ department: 'Nope Corp' })];
      mocks.csv.parse.mockReturnValue({ rows, errorReport: [] });
      mocks.prisma.department.findMany.mockResolvedValue([]); // department not found
      mocks.prisma.team.findMany.mockResolvedValue([]);
      mockEmployeeFindMany(mocks);
      mockHistoryCreate(mocks, { status: 'failed', successCount: 0, failedCount: 1 });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).not.toHaveBeenCalled();
      expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
      expect(result.status).toBe('failed');
      expect(result.failedCount).toBe(1);
      expect(result.errorReport?.[0]?.errors.join(' ')).toContain('not found');
    });

    it('rejects rows whose department is outside the manager scope', async () => {
      mocks.rbac.departmentScope.mockResolvedValue(['dept-A']);
      const rows = [rowNoTeam()]; // Engineering → dept-1, outside scope
      mocks.csv.parse.mockReturnValue({ rows, errorReport: [] });
      mocks.prisma.department.findMany.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);
      mocks.prisma.team.findMany.mockResolvedValue([]);
      mockEmployeeFindMany(mocks);
      mockHistoryCreate(mocks, { status: 'failed', successCount: 0, failedCount: 1 });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).not.toHaveBeenCalled();
      expect(result.errorReport?.[0]?.errors.join(' ')).toContain('outside your assigned scope');
    });

    it('carries parse-stage row errors into the report and excludes the row', async () => {
      const good = rowNoTeam();
      const bad = rowNoTeam({ employeeCode: 'X!', email: 'not-an-email' }, [
        'employeeCode may only contain letters, numbers, dots, dashes and underscores',
        '"not-an-email" is not a valid email',
      ]);
      mocks.csv.parse.mockReturnValue({
        rows: [good, bad],
        errorReport: [{ row: 3, employeeCode: 'X!', email: 'not-an-email', errors: bad.errors }],
      });
      mocks.prisma.department.findMany.mockResolvedValue([{ id: 'dept-1', name: 'Engineering' }]);
      mocks.prisma.team.findMany.mockResolvedValue([]);
      mockEmployeeFindMany(mocks);
      mocks.prisma.employee.create.mockResolvedValue({ id: 'emp-1' });
      mocks.prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<number>) =>
        fn(mocks.prisma),
      );
      mockHistoryCreate(mocks, { status: 'partial', successCount: 1, failedCount: 1 });

      const result = await service.importCsv(ACTOR, FILE);

      expect(mocks.prisma.employee.create).toHaveBeenCalledTimes(1);
      expect(mocks.prisma.employee.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'alex@company.com' }) }),
      );
      expect(result.status).toBe('partial');
      expect(result.failedCount).toBe(1);
      expect(result.errorReport).toHaveLength(1);
    });
  });
});
