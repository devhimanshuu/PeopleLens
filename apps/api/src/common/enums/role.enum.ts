/**
 * Enterprise role model for PeopleLens.
 *
 * Coarse-grained by design — fine-grained permission decisions belong in a
 * policy/RBAC matrix, not in the enum. Role values are stable strings so they
 * can be stored in the database and embedded in JWTs.
 */
export enum Role {
  /** Platform administrators — full system access. */
  ADMIN = 'admin',
  /** HR leadership — workforce analytics across the entire organization. */
  HR_LEAD = 'hr_lead',
  /** People analysts — governed read + export access. */
  ANALYST = 'analyst',
  /** People managers — visibility into their own team. */
  MANAGER = 'manager',
  /** Individual contributor — self-service access only. */
  MEMBER = 'member',
}
