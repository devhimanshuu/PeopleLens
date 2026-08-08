/**
 * PeopleLens shared domain contracts.
 *
 * Phase 2 introduces the core domain: identity, organization and workforce
 * records plus the pagination / dashboard / import shapes both applications
 * agree on. The API is the source of truth for persistence; this package is
 * the source of truth for wire shapes so web and API can never drift.
 */

/** Primitive values representable in JSON. */
export type JsonPrimitive = string | number | boolean | null;

/** Any JSON-serializable value. */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Opaque identifier used across PeopleLens entities. */
export type EntityId = string;

/** ISO-8601 timestamp. */
export type IsoDate = string;

/** Shape returned by `GET /api/health`. */
export interface HealthStatus {
  /** `degraded` when a backing dependency (Postgres) is unreachable. */
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  timestamp: IsoDate;
  uptimeSeconds: number;
  /** Database connectivity: `up` when `SELECT 1` succeeds. */
  db: 'up' | 'down';
}

/** Brand tone used by the department breakdown visualization. */
export type DepartmentTone = 'indigo' | 'cyan' | 'emerald' | 'violet';

/** One trend series rendered as a sparkline. */
export interface SparkSeries {
  label: string;
  value: number;
  suffix: string;
  decimals: number;
  data: number[];
}

/**
 * Live workforce-signal snapshot served by `GET /api/signals/live`.
 *
 * Deterministic baseline data (no DB dependency yet) with real timestamps
 * and a slowly ticking signal count so the dashboard reads as live.
 */
export interface LiveSignalsSnapshot {
  generatedAt: IsoDate;
  uptimeSeconds: number;
  /** Composite health score, 0–100. */
  healthScore: number;
  /** Change vs. previous period, in points. */
  healthDelta: number;
  headcount: number;
  engagementPercent: number;
  flightRiskPercent: number;
  /** Signals received in the current rolling window. */
  signalsTotal: number;
  signalsBySource: Array<{ source: string; count: number }>;
  modelRefreshedAt: IsoDate;
  departments: Array<{ name: string; pct: number; tone: DepartmentTone }>;
  /** Attrition risk per heat-map cell, 0..1. */
  heatMap: number[];
  spark: SparkSeries[];
}

/**
 * Standard API response envelope.
 *
 * Every PeopleLens API response is wrapped by the global response interceptor
 * into this shape so clients rely on a single, stable contract:
 * `{ success, message, data, timestamp }`.
 */
export interface ApiResponse<T> {
  success: true;
  /** Human-readable summary, e.g. `OK`. */
  message: string;
  data: T;
  /** ISO-8601 timestamp of when the response was produced. */
  timestamp: IsoDate;
}

/** Error payload produced by the global exception filter. */
export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  /** ISO-8601 timestamp of when the error was produced. */
  timestamp: IsoDate;
  /** HTTP status code. */
  statusCode: number;
  /** Stable error category, e.g. `Bad Request`. */
  error: string;
  /** Request path that produced the error. */
  path: string;
  /** Correlation id — matches the server-side `X-Request-Id` header. */
  requestId?: string;
  /** Optional machine-readable detail (e.g. DTO validation messages). */
  details?: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domain enums (mirrors of the Prisma enums)
// ─────────────────────────────────────────────────────────────────────────────

/** Platform access roles. */
export type Role = 'admin' | 'manager' | 'viewer';

/** Employment lifecycle state. */
export type EmployeeStatus = 'active' | 'on_leave' | 'probation' | 'terminated';

/** Gender identity (self-reported). */
export type Gender = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

/** Outcome of a CSV bulk import. */
export type ImportStatus = 'completed' | 'partial' | 'failed';

// ─────────────────────────────────────────────────────────────────────────────
// Identity & organization
// ─────────────────────────────────────────────────────────────────────────────

/** Platform account with RBAC role. */
export interface User {
  id: EntityId;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  /** Linked employee profile id, when claimed. */
  employeeId?: EntityId | null;
}

/** Organizational unit with hierarchy + assigned manager. */
export interface Department {
  id: EntityId;
  name: string;
  description?: string | null;
  isActive: boolean;
  parentId?: EntityId | null;
  /** Id of the manager user whose RBAC scope includes this department. */
  managerUserId?: EntityId | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** Lightweight manager identity embedded in department listings. */
export type DepartmentManager = Pick<User, 'id' | 'name' | 'email' | 'role'>;

/** Department joined with aggregate info for listing. */
export interface DepartmentSummary extends Department {
  manager?: DepartmentManager | null;
  parent?: Pick<Department, 'id' | 'name'> | null;
  children?: Array<Pick<Department, 'id' | 'name'>>;
  teamCount: number;
  employeeCount: number;
}

/** Sub-unit of a department. */
export interface Team {
  id: EntityId;
  name: string;
  description?: string | null;
  isActive: boolean;
  departmentId: EntityId;
  leadEmployeeId?: EntityId | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
}

/** Team joined with parent department + aggregate info. */
export interface TeamSummary extends Team {
  department?: Pick<Department, 'id' | 'name'> | null;
  leadEmployee?: Pick<Employee, 'id' | 'firstName' | 'lastName'> | null;
  employeeCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Workforce
// ─────────────────────────────────────────────────────────────────────────────

/** Employee record — the core workforce domain. */
export interface Employee {
  id: EntityId;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  jobTitle: string;
  gender: Gender;
  dateOfBirth?: IsoDate | null;
  hiredAt: IsoDate;
  status: EmployeeStatus;
  isActive: boolean;
  departmentId: EntityId;
  teamId?: EntityId | null;
  managerId?: EntityId | null;
  userId?: EntityId | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  /** Set when the record is soft-deleted; null while active. */
  deletedAt?: IsoDate | null;
}

/** Employee joined with org context for listings and detail views. */
export interface EmployeeView extends Employee {
  department?: Pick<Department, 'id' | 'name'> | null;
  team?: Pick<Team, 'id' | 'name'> | null;
  manager?: Pick<Employee, 'id' | 'firstName' | 'lastName' | 'email'> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

/** Paged list payload returned by list endpoints. */
export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────────────────────────────

/** One row's validation outcome. */
export interface ImportRowError {
  row: number;
  employeeCode?: string | null;
  email?: string | null;
  errors: string[];
}

/** Result of a CSV bulk import. */
export interface ImportHistory {
  id: EntityId;
  fileName: string;
  status: ImportStatus;
  totalRows: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  errorReport?: ImportRowError[] | null;
  importedByUserId: EntityId;
  createdAt: IsoDate;
}

/** Import record joined with the actor's identity. */
export interface ImportHistoryView extends ImportHistory {
  importedBy?: Pick<User, 'id' | 'name' | 'email'> | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit trail
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stable list of audited actions — the single source of truth.
 * `AuditAction` is derived from it so filters and the union can never drift.
 */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'restore',
  'role_change',
  'import',
] as const;

/** State-changing operations recorded in the audit trail. */
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Stable list of audited entity types — single source of truth; the
 * `AuditEntityType` union is derived from it.
 */
export const AUDIT_ENTITY_TYPES = ['user', 'department', 'team', 'employee', 'import'] as const;

/** Entities that can be audited. */
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/** One audit trail entry, joined with the actor's identity. */
export interface AuditLogView {
  id: EntityId;
  actorUserId?: EntityId | null;
  actor?: Pick<User, 'id' | 'name' | 'email'> | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: EntityId | null;
  details?: JsonValue | null;
  ipAddress?: string | null;
  createdAt: IsoDate;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────────────

/** One slice for distribution charts. */
export interface DistributionSlice {
  name: string;
  value: number;
}

/**
 * Optional dashboard slice filters — applied server-side so scoping stays
 * authoritative. `departmentId`/`teamId` for managers are intersected with
 * their assigned scope.
 */
export interface DashboardFilters {
  departmentId?: string;
  teamId?: string;
  status?: EmployeeStatus;
  gender?: Gender;
}

/** Aggregated KPI + distribution payload for the analytics dashboard. */
export interface DashboardOverview {
  kpis: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    totalManagers: number;
    totalTeams: number;
  };
  /** Department options for the filter UI (id + name), already scope-aware. */
  departments: Array<Pick<Department, 'id' | 'name'>>;
  departmentDistribution: DistributionSlice[];
  employeeStatus: DistributionSlice[];
  genderDistribution: DistributionSlice[];
  recentHires: EmployeeView[];
}

/** Raw CSV row as parsed from an uploaded file. */
export interface CsvEmployeeRow {
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  gender?: string;
  dateOfBirth?: string;
  hiredAt?: string;
  status?: string;
  department?: string;
  team?: string;
  managerEmail?: string;
}
