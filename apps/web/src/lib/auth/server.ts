import { createNeonAuth } from '@neondatabase/auth/next/server';

/**
 * Server-side Managed Better Auth instance.
 *
 * Required env vars (from the Neon Console → Branch → Auth → Configuration):
 *  - NEON_AUTH_BASE_URL       the `neonauth.*.neon.build` base URL for this branch
 *  - NEON_AUTH_COOKIE_SECRET  session cookie signing secret (32+ chars, e.g. `openssl rand -base64 32`)
 *
 * While the env vars are missing we fall back to inert values so the app still
 * builds and renders; auth API calls return a network error (NETWORK_DNS) until
 * they are configured.
 */
const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  console.warn(
    '[neon-auth] NEON_AUTH_BASE_URL / NEON_AUTH_COOKIE_SECRET are not set. ' +
      'Auth endpoints will be unavailable until configured (see .env.example).',
  );
}

/**
 * Fallback secret used ONLY so the app boots before env is configured. It is
 * generated fresh per process (never a known constant), so it cannot be used
 * to forge sessions — sessions simply do not survive restarts until
 * NEON_AUTH_COOKIE_SECRET is set.
 */
const fallbackSecret =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `${crypto.randomUUID()}${crypto.randomUUID()}${crypto.randomUUID()}`
    : `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;

export const auth = createNeonAuth({
  baseUrl: baseUrl ?? 'https://missing-neon-auth-base-url.invalid/neondb/auth',
  cookies: {
    secret: cookieSecret ?? fallbackSecret,
  },
});
