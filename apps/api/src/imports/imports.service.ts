import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CsvEmployeeRow,
  Gender,
  ImportHistoryView,
  ImportRowError,
  Paginated,
} from '@peoplelens/types';
import { Prisma, type EmployeeStatus, type ImportHistory } from '@prisma/client';
import { AuditService } from '@app/audit/audit.service';
import type { RequestUser } from '@app/common/interfaces/request-user.interface';
import { RbacService } from '@app/common/services/rbac.service';
import { PrismaService } from '@app/database/prisma.service';
import { CsvService, type ParsedRow } from './csv.service';

/** Analytics-profile columns accepted by the CSV pipeline — all nullable. */
type AnalyticsProfileInput = {
  attrition?: boolean;
  attritionDate?: Date;
  monthlyIncome?: number | null;
  jobSatisfaction?: number | null;
  environmentSatisfaction?: number | null;
  relationshipSatisfaction?: number | null;
  workLifeBalance?: number | null;
  // Non-nullable in the schema — empty cells fall back to the default.
  overTime?: boolean;
  performanceRating?: number | null;
  education?: number | null;
  educationField?: string | null;
  jobLevel?: number | null;
  yearsAtCompany?: number | null;
  yearsInCurrentRole?: number | null;
  yearsSinceLastPromotion?: number | null;
  yearsWithCurrManager?: number | null;
  totalWorkingYears?: number | null;
  distanceFromHome?: number | null;
  maritalStatus?: string | null;
  businessTravel?: string | null;
  numCompaniesWorked?: number | null;
  trainingTimesLastYear?: number | null;
  percentSalaryHike?: number | null;
  stockOptionLevel?: number | null;
};
// Bulk employee import from CSV. Pipeline: parse → structural validation → resolve references (department /…
// team / manager by name or email) → duplicate detection (file + database) → transactional insert of the valid…
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
      // Forbidden, not BadRequest — viewers hitting this (the @Roles guard normally intercepts first) must get the…
      // same 403 semantics as every other RBAC denial so the client treats it as a permissions failure.
      throw new ForbiddenException('Read-only access — your role cannot import employees');
    }

    const startedAt = Date.now();
    const { rows, errorReport } = this.csv.parse(file.buffer, file.originalname);
    const references = await this.resolveReferences(actor, rows);
    const duplicateCheck = await this.detectDuplicates(rows);
    // A row is insertable only when it passes ALL three stages: row-level validation, reference resolution…
    // (department/team/manager + scope) and duplicate detection. We carry the ORIGINAL index through so resolved…
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
      const data: Prisma.EmployeeUncheckedCreateInput[] = insertableRows.map(
        ({ row, originalIndex }) => {
          const refs = references.resolved[originalIndex]!;
          const profile = this.parseAnalyticsProfile(row.data);
          // Attrition is a lifecycle event — a flagged leaver is terminated
          // unless the row carries an explicit status.
          const attritionFlag = ['yes', 'y', 'true', '1'].includes(
            (row.data.attrition ?? '').trim().toLowerCase(),
          );
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
            status:
              (row.data.status as EmployeeStatus) ?? (attritionFlag ? 'terminated' : 'active'),
            departmentId: refs.departmentId,
            teamId: refs.teamId,
            managerId: refs.managerId,
            ...profile,
          };
        },
      );

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
        durationMs: Date.now() - startedAt,
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
    // Scope: admins see the whole feed; managers and viewers only see imports they performed. Import history…
    // carries org data (filenames, counts, per-row error reports with employee emails/codes), so letting a manager…
    const where: Prisma.ImportHistoryWhereInput = this.rbac.isAdmin(actor)
      ? {}
      : { importedByUserId: actor.sub };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.importHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { importedByUser: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.importHistory.count({ where }),
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
    // Same scope rule as findAll — a non-admin may only read imports they performed. A NotFound (not Forbidden)…
    // keeps the resource opaque: an out-of-scope import id is indistinguishable from a nonexistent one.
    if (!this.rbac.isAdmin(actor) && history.importedByUserId !== actor.sub) {
      throw new NotFoundException('Import record not found');
    }
    return this.toView(history);
  }

  buildTemplate(): string {
    return this.csv.buildTemplate();
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  // Converts the CSV string profile columns into typed values for the insert. Values are nullable by design: an…
  // optional column left blank stays null so analytics report "not available" instead of a fabricated number.…
  private parseAnalyticsProfile(row: CsvEmployeeRow): AnalyticsProfileInput {
    const toInt = (value: string | undefined): number | null => {
      if (value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isInteger(n) ? n : null;
    };
    const toBool = (value: string | undefined): boolean | null => {
      if (value === undefined || value === '') return null;
      const v = value.toLowerCase();
      return ['yes', 'y', 'true', '1'].includes(v);
    };

    const attrition = toBool(row.attrition);
    return {
      attrition: attrition ?? false,
      ...(attrition && row.attritionDate && !Number.isNaN(Date.parse(row.attritionDate))
        ? { attritionDate: new Date(row.attritionDate) }
        : attrition
          ? { attritionDate: new Date() }
          : {}),
      monthlyIncome: toInt(row.monthlyIncome),
      jobSatisfaction: toInt(row.jobSatisfaction),
      environmentSatisfaction: toInt(row.environmentSatisfaction),
      relationshipSatisfaction: toInt(row.relationshipSatisfaction),
      workLifeBalance: toInt(row.workLifeBalance),
      // Non-nullable schema columns — an empty cell falls back to the default.
      overTime: toBool(row.overTime) ?? false,
      performanceRating: toInt(row.performanceRating),
      education: toInt(row.education),
      educationField: row.educationField || null,
      jobLevel: toInt(row.jobLevel),
      yearsAtCompany: toInt(row.yearsAtCompany),
      yearsInCurrentRole: toInt(row.yearsInCurrentRole),
      yearsSinceLastPromotion: toInt(row.yearsSinceLastPromotion),
      yearsWithCurrManager: toInt(row.yearsWithCurrManager),
      totalWorkingYears: toInt(row.totalWorkingYears),
      distanceFromHome: toInt(row.distanceFromHome),
      maritalStatus: row.maritalStatus || null,
      businessTravel: row.businessTravel || null,
      numCompaniesWorked: toInt(row.numCompaniesWorked),
      trainingTimesLastYear: toInt(row.trainingTimesLastYear),
      percentSalaryHike: toInt(row.percentSalaryHike),
      stockOptionLevel: toInt(row.stockOptionLevel),
    };
  }

  private async resolveReferences(actor: RequestUser, rows: ParsedRow[]) {
    // Query with the ORIGINAL (trimmed) names/emails — Postgres `IN` is case-sensitive, so lowercasing the lookup…
    // values would miss rows that are stored with capitals (e.g. "Engineering"). Matching against the results is…
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
      // An employee must belong to a department (NOT NULL FK), so a row without one cannot be imported — surface it…
      // as a row error instead of letting the insert throw and abort the whole file.
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
    // employeeCode and email are tracked INDEPENDENTLY — a single "email ?? code" key would miss two rows sharing a…
    // code with different emails, letting both through to the insert where the second hits the unique index and…
    const seenCodes = new Map<string, number>(); // normalized code → first row number
    const seenEmails = new Map<string, number>(); // normalized email → first row number
    const errorRows: Record<number, boolean> = {};
    let duplicateCount = 0;

    const allCodes = rows.map((r) => r.data.employeeCode).filter(Boolean) as string[];
    const allEmails = rows.map((r) => r.data.email).filter(Boolean) as string[];
    // NOTE: soft-deleted employees are included. The unique indexes on employeeCode/email are global (not partial),…
    // so a deleted employee still occupies its identifiers — excluding them here would let a row pass duplicate…
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

      // DB duplicates apply to every row (an insertable row would collide).
      if (code && dbCodeSet.has(code)) {
        errors.push(`Employee code "${row.data.employeeCode}" already exists in the database`);
      }
      if (email && dbEmailSet.has(email)) {
        errors.push(`Email "${row.data.email}" already exists in the database`);
      }
      // Within-file duplicates — only among rows that passed row-level validation (an invalid row never occupies its…
      // identifiers), and checked per field so code-collisions and email-collisions are both caught no matter how the…
      if (row.errors.length === 0) {
        if (code && !dbCodeSet.has(code)) {
          const first = seenCodes.get(code);
          if (first !== undefined) {
            errors.push(
              `Employee code "${row.data.employeeCode}" duplicates row ${first} within the file`,
            );
            duplicateCount += 1;
          } else {
            seenCodes.set(code, row.rowNumber);
          }
        }
        if (email && !dbEmailSet.has(email)) {
          const first = seenEmails.get(email);
          if (first !== undefined) {
            errors.push(`Email "${row.data.email}" duplicates row ${first} within the file`);
            duplicateCount += 1;
          } else {
            seenEmails.set(email, row.rowNumber);
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
      durationMs: h.durationMs ?? null,
      importedBy: h.importedByUser
        ? { id: h.importedByUser.id, name: h.importedByUser.name, email: h.importedByUser.email }
        : null,
    };
  }
}
