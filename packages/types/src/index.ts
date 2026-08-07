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

/** Shape returned by `GET /api/health`. */
export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  timestamp: IsoDate;
  uptimeSeconds: number;
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
