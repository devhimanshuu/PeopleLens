import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Gender, ImportHistoryView, ImportRowError, Paginated } from '@peoplelens/types';
import { Prisma, type EmployeeStatus, type ImportHistory } from '@prisma/client';
import { type AuditService } from '@app/audit/audit.service';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { type RbacService } from '@app/common/services/rbac.service';
import { type PrismaService } from '@app/database/prisma.service';
import { type CsvService, type ParsedRow } from './csv.service';

/**
 * Bulk employee import from CSV.
 *
 * Pipeline: parse → structural validation → resolve references (department /
 * team / manager by name or email) → duplicate detection (file + database) →
 * transactional insert of the valid rows → ImportHistory record carrying the
 * per-row error report.
 */
@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly csv: CsvService,
    private readonly rbac: RbacService,
    private readonly audit: AuditService,
  ) {}

  async importCsv(
    actor: RequestUser,
    file: Express.Multer.File,
    ip?: string,
  ): Promise<ImportHistoryView> {
    if (!file) throw new BadRequestException('No file uploaded');
    if (file.mimetype !== 'text/csv' && !file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }
    if (!this.rbac.canWrite(actor)) {
      // Forbidden, not BadRequest — viewers hitting this (the @Roles guard
      // normally intercepts first) must get the same 403 semantics as every
      // other RBAC denial so the client treats it as a permissions failure.
      throw new ForbiddenException('Read-only access — your role cannot import employees');
    }

    const { rows, errorReport } = this.csv.parse(file.buffer, file.originalname);
    const references = await this.resolveReferences(actor, rows);
    const duplicateCheck = await this.detectDuplicates(rows);

    // A row is insertable only when it passes ALL three stages: row-level
    // validation, reference resolution (department/team/manager + scope) and
    // duplicate detection. We carry the ORIGINAL index through so resolved
    // references stay aligned with the source rows (filtering first would
    // shift them and silently assign wrong departments/managers).
    const insertableRows = rows
      .map((row, originalIndex) => ({ row, originalIndex }))
      .filter(
        ({ row, originalIndex }) =>
          row.errors.length === 0 &&
          !references.errorRows[originalIndex] &&
          duplicateCheck.errorRows[originalIndex] === undefined,
      );

    // Build one error report: row validation + reference + duplicate failures.
    const fullReport: ImportRowError[] = [
      ...errorReport,
      ...references.referenceErrors,
      ...duplicateCheck.duplicateErrors,
    ].sort((a, b) => a.row - b.row);

    let successCount = 0;
    if (insertableRows.length > 0) {
      const data = insertableRows.map(({ row, originalIndex }) => {
        const refs = references.resolved[originalIndex]!;
        return {
          employeeCode: row.data.employeeCode!,
          firstName: row.data.firstName!,
          lastName: row.data.lastName!,
          email: row.data.email!,
          phone: row.data.phone ?? null,
          jobTitle: row.data.jobTitle!,
          gender: (row.data.gender as Gender) ?? 'prefer_not_to_say',
          dateOfBirth: row.data.dateOfBirth ? new Date(row.data.dateOfBirth) : null,
          hiredAt: new Date(row.data.hiredAt!),
          status: (row.data.status as EmployeeStatus) ?? 'active',
          departmentId: refs.departmentId,
          teamId: refs.teamId,
          managerId: refs.managerId,
        };
      });

      const result = await this.prisma.$transaction(async (tx) => {
        // createMany cannot return rows; create sequentially for reporting.
        let created = 0;
        for (const record of data) {
          await tx.employee.create({ data: record });
          created += 1;
        }
        return created;
      });
      successCount = result;
    }

    const status =
      successCount === 0 ? 'failed' : fullReport.length === 0 ? 'completed' : 'partial';

    const history = await this.prisma.importHistory.create({
      data: {
        fileName: file.originalname,
        status,
        totalRows: rows.length,
        successCount,
        failedCount: rows.length - successCount,
        duplicateCount: duplicateCheck.duplicateCount,
        errorReport:
          fullReport.length > 0
            ? (fullReport as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        importedByUserId: actor.sub,
      },
      include: { importedByUser: { select: { id: true, name: true, email: true } } },
    });

    await this.audit.record(
      actor.sub,
      'import',
      'import',
      history.id,
      { fileName: file.originalname, success: successCount, failed: rows.length - successCount },
      ip,
    );

    return this.toView(history);
  }

  async findAll(
    actor: RequestUser,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ImportHistoryView>> {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importHistory.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { importedByUser: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.importHistory.count(),
    ]);
    return {
      items: items.map((h) => this.toView(h)),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(actor: RequestUser, id: string): Promise<ImportHistoryView> {
    const history = await this.prisma.importHistory.findUnique({
      where: { id },
      include: { importedByUser: { select: { id: true, name: true, email: true } } },
    });
    if (!history) throw new NotFoundException('Import record not found');
    return this.toView(history);
  }

  buildTemplate(): string {
    return this.csv.buildTemplate();
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async resolveReferences(actor: RequestUser, rows: ParsedRow[]) {
    // Query with the ORIGINAL (trimmed) names/emails — Postgres `IN` is
    // case-sensitive, so lowercasing the lookup values would miss rows that
    // are stored with capitals (e.g. "Engineering"). Matching against the
    // results is case-insensitive (see below).
    const nonEmpty = (value: string | undefined): value is string => Boolean(value);
    const departmentNames = new Set(rows.map((r) => r.data.department?.trim()).filter(nonEmpty));
    const teamNames = new Set(rows.map((r) => r.data.team?.trim()).filter(nonEmpty));
    const managerEmails = new Set(rows.map((r) => r.data.managerEmail?.trim()).filter(nonEmpty));

    const [departments, teams, managers, scope] = await Promise.all([
      departmentNames.size > 0
        ? this.prisma.department.findMany({
            where: { deletedAt: null, name: { in: [...departmentNames] } },
          })
        : Promise.resolve([]),
      teamNames.size > 0
        ? this.prisma.team.findMany({
            where: {
              deletedAt: null,
              name: { in: [...teamNames] },
              department: { deletedAt: null },
            },
            include: { department: { select: { id: true, name: true } } },
          })
        : Promise.resolve([]),
      managerEmails.size > 0
        ? this.prisma.employee.findMany({
            where: { deletedAt: null, email: { in: [...managerEmails] } },
            select: { id: true, email: true },
          })
        : Promise.resolve([]),
      this.rbac.departmentScope(actor),
    ]);

    const byName = (name: string | undefined) => name?.trim().toLowerCase() ?? '';

    const resolved: Array<{
      departmentId: string;
      teamId: string | null;
      managerId: string | null;
    }> = [];
    const referenceErrors: ImportRowError[] = [];
    const errorRows: Record<number, boolean> = {};

    rows.forEach((row, index) => {
      const errors: string[] = [];
      const departmentName = byName(row.data.department);
      const department = departmentName
        ? departments.find((d) => d.name.toLowerCase() === departmentName)
        : undefined;

      // An employee must belong to a department (NOT NULL FK), so a row
      // without one cannot be imported — surface it as a row error instead
      // of letting the insert throw and abort the whole file.
      if (!departmentName) {
        errors.push('department is required to place this employee');
      } else if (!department) {
        errors.push(`Department "${row.data.department}" not found`);
      }
      if (department && scope && !scope.includes(department.id)) {
        errors.push(`Department "${row.data.department}" is outside your assigned scope`);
      }

      let teamId: string | null = null;
      const teamName = byName(row.data.team);
      if (teamName) {
        const team = teams.find((t) => t.name.toLowerCase() === teamName);
        if (!team) {
          errors.push(`Team "${row.data.team}" not found`);
        } else if (department && team.departmentId !== department.id) {
          errors.push(
            `Team "${row.data.team}" does not belong to department "${row.data.department}"`,
          );
        } else {
          teamId = team.id;
        }
      }

      let managerId: string | null = null;
      const managerEmail = byName(row.data.managerEmail);
      if (managerEmail) {
        const manager = managers.find((m) => m.email.toLowerCase() === managerEmail);
        if (!manager) {
          errors.push(`Manager with email "${row.data.managerEmail}" not found`);
        } else {
          managerId = manager.id;
        }
      }

      resolved.push({ departmentId: department?.id ?? '', teamId, managerId });
      if (errors.length > 0) {
        errorRows[index] = true;
        referenceErrors.push({
          row: row.rowNumber,
          employeeCode: row.data.employeeCode ?? null,
          email: row.data.email ?? null,
          errors,
        });
      }
    });

    return { resolved, referenceErrors, errorRows };
  }

  private async detectDuplicates(rows: ParsedRow[]) {
    const duplicateErrors: ImportRowError[] = [];
    const seenInFile = new Map<string, number>(); // normalized key → first row number
    const errorRows: Record<number, boolean> = {};
    let duplicateCount = 0;

    const allCodes = rows.map((r) => r.data.employeeCode).filter(Boolean) as string[];
    const allEmails = rows.map((r) => r.data.email).filter(Boolean) as string[];
    // NOTE: soft-deleted employees are included. The unique indexes on
    // employeeCode/email are global (not partial), so a deleted employee
    // still occupies its identifiers — excluding them here would let a row
    // pass duplicate detection and then fail on the raw unique constraint.
    const [dbByCode, dbByEmail] = await Promise.all([
      allCodes.length > 0
        ? this.prisma.employee.findMany({
            where: { employeeCode: { in: allCodes } },
            select: { employeeCode: true },
          })
        : Promise.resolve([]),
      allEmails.length > 0
        ? this.prisma.employee.findMany({
            where: { email: { in: allEmails } },
            select: { email: true },
          })
        : Promise.resolve([]),
    ]);
    const dbCodeSet = new Set(dbByCode.map((e) => e.employeeCode.toLowerCase()));
    const dbEmailSet = new Set(dbByEmail.map((e) => e.email.toLowerCase()));

    rows.forEach((row, index) => {
      const errors: string[] = [];
      const code = row.data.employeeCode?.toLowerCase();
      const email = row.data.email?.toLowerCase();

      if (code && dbCodeSet.has(code)) {
        errors.push(`Employee code "${row.data.employeeCode}" already exists in the database`);
        dbCodeSet.add(code);
      }
      if (email && dbEmailSet.has(email)) {
        errors.push(`Email "${row.data.email}" already exists in the database`);
        dbEmailSet.add(email);
      }

      // Within-file duplicates (only count when the row is otherwise valid).
      if (row.errors.length === 0) {
        const key = email ?? code;
        if (key) {
          const first = seenInFile.get(key);
          if (first !== undefined) {
            errors.push(`Duplicate of row ${first} within the file`);
            duplicateCount += 1;
          } else {
            seenInFile.set(key, row.rowNumber);
          }
        }
      }

      if (errors.length > 0) {
        errorRows[index] = true;
        duplicateErrors.push({
          row: row.rowNumber,
          employeeCode: row.data.employeeCode ?? null,
          email: row.data.email ?? null,
          errors,
        });
      }
    });

    return { errorRows, duplicateErrors, duplicateCount };
  }

  private toView(
    h: ImportHistory & { importedByUser?: { id: string; name: string; email: string } | null },
  ): ImportHistoryView {
    return {
      id: h.id,
      fileName: h.fileName,
      status: h.status,
      totalRows: h.totalRows,
      successCount: h.successCount,
      failedCount: h.failedCount,
      duplicateCount: h.duplicateCount,
      errorReport: (h.errorReport as ImportRowError[] | null) ?? null,
      importedByUserId: h.importedByUserId,
      createdAt: h.createdAt.toISOString(),
      importedBy: h.importedByUser
        ? { id: h.importedByUser.id, name: h.importedByUser.name, email: h.importedByUser.email }
        : null,
    };
  }
}
