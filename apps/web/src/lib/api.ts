import type { HealthStatus, LiveSignalsSnapshot } from '@peoplelens/types';

/**
 * Browser-facing API base. Overridable per environment; defaults to the
 * local NestJS dev server (see apps/web/.env.example).
 *
 * NOTE: real deployments must set NEXT_PUBLIC_API_URL to their API origin
 * at build time — the localhost fallback is for local development only.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const REQUEST_TIMEOUT_MS = 4000;

async function get<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** `GET /api/health` — process health + uptime. */
export function fetchHealth(): Promise<HealthStatus | null> {
  return get<HealthStatus>('/health');
}

/** `GET /api/signals/live` — current workforce signal snapshot. */
export function fetchLiveSignals(): Promise<LiveSignalsSnapshot | null> {
  return get<LiveSignalsSnapshot>('/signals/live');
}
