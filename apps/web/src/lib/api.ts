import type { ApiResponse, HealthStatus, LiveSignalsSnapshot } from '@peoplelens/types';

/**
 * Browser-facing API base. Overridable per environment; defaults to the
 * local NestJS dev server (see apps/web/.env.example).
 *
 * NOTE: real deployments must set NEXT_PUBLIC_API_URL to their API origin
 * at build time — the localhost fallback is for local development only.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const REQUEST_TIMEOUT_MS = 4000;

/**
 * GET a versioned API endpoint and unwrap the standard response envelope
 * (`{ success, message, data, timestamp }`), returning the `data` payload.
 * Any failure (network, timeout, non-2xx) resolves to `null` — the landing
 * degrades gracefully to its deterministic mock snapshot.
 */
async function get<T>(path: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ApiResponse<T>;
    return payload.success ? payload.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** `GET /api/v1/health` — process health + uptime. */
export function fetchHealth(): Promise<HealthStatus | null> {
  return get<HealthStatus>('/health');
}

/** `GET /api/v1/signals/live` — current workforce signal snapshot. */
export function fetchLiveSignals(): Promise<LiveSignalsSnapshot | null> {
  return get<LiveSignalsSnapshot>('/signals/live');
}
