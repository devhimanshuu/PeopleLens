import type {
  ApiErrorResponse,
  ApiResponse,
  HealthStatus,
  LiveSignalsSnapshot,
} from '@peoplelens/types';
import { getStoredSession, syncOAuthSession } from '@/lib/auth';
// Browser-facing API client. Every request carries the Neon Auth session token as `Authorization: Bearer…
// <token>`; the API validates it against the Neon Auth server and resolves the caller's RBAC role from the…

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const REQUEST_TIMEOUT_MS = 15000;

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Do not attach the auth header (public endpoints only). */
  noAuth?: boolean;
  /** Skip the 401-refresh-and-retry cycle (used by the refresh itself). */
  skipRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, noAuth, skipRetry, headers, ...rest } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const authHeader = !noAuth ? getAuthHeader() : undefined;
  const isFormData = body instanceof FormData;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      // Include same-site cookies so the `__Secure-neon-auth.*` session cookie (HttpOnly — invisible to JS) travels…
      // with the request; the API validates sessions via that cookie.
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...headers,
      },
      ...(body !== undefined && !isFormData ? { body: JSON.stringify(body) } : {}),
      ...(body !== undefined && isFormData ? { body } : {}),
    });

    if (response.status === 401 && !skipRetry && !noAuth) {
      await syncOAuthSession();
      if (getStoredSession()) {
        return request<T>(path, { ...options, skipRetry: true });
      }
    }

    if (!response.ok) {
      throw await toError(response);
    }

    const payload = (await response.json()) as ApiResponse<T>;
    return payload.data;
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError('Request timed out — please try again', 408);
    }
    throw new ApiClientError('Could not reach the PeopleLens API. Is the API running?', 0, error);
  } finally {
    clearTimeout(timeout);
  }
}

function getAuthHeader(): string | undefined {
  const session = getStoredSession();
  return session?.token ? `Bearer ${session.token}` : undefined;
}

async function toError(response: Response): Promise<ApiClientError> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;
    return new ApiClientError(
      payload.message || `Request failed (${response.status})`,
      response.status,
      payload.details,
    );
  } catch {
    return new ApiClientError(`Request failed (${response.status})`, response.status);
  }
}

// ── typed helpers ────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

// ── public (unauthenticated) helpers for the marketing site ──────────────────

/** `GET /api/v1/health` — process health + uptime (public). */
export function fetchHealth(): Promise<HealthStatus | null> {
  return request<HealthStatus>('/health', { noAuth: true }).catch(() => null);
}

/** `GET /api/v1/signals/live` — live workforce signal snapshot (public). */
export function fetchLiveSignals(): Promise<LiveSignalsSnapshot | null> {
  return request<LiveSignalsSnapshot>('/signals/live', { noAuth: true }).catch(() => null);
}

// ── authenticated downloads (e.g. CSV template) ──────────────────────────────

// Fetches an auth-protected endpoint as a Blob and triggers a browser download. Plain `<a href download>`…
// cannot attach the bearer token, so any protected file must go through this helper.
export async function downloadAuthenticated(path: string, filename: string): Promise<void> {
  const authHeader = getAuthHeader();
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'text/csv, application/octet-stream',
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });
  if (!response.ok) throw await toError(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
