/**
 * Core shared types for PeopleLens.
 *
 * Domain contracts (Employee, Organization, …) arrive in Phase 2 once the
 * Prisma schema defines them. This package is the single place web and API
 * agree on cross-cutting shapes so the two never drift.
 */

/** Primitive values representable in JSON. */
export type JsonPrimitive = string | number | boolean | null;

/** Any JSON-serializable value. */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/** Opaque identifier used across PeopleLens entities. */
export type EntityId = string;

/** ISO-8601 timestamp. */
export type IsoDate = string;
