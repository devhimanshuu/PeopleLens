import { type NextRequest, NextResponse } from 'next/server';

/**
 * Server-side auth guard for the public auth pages.
 *
 * Runs in the Edge runtime before any route renders: if a session cookie is
 * present (mirrored by `lib/auth`'s `setStoredSession`), a signed-in user is
 * redirected to the landing page — the sign-in/sign-up form never loads.
 *
 * NOTE: this is a UX guard, not a security boundary — the cookie is forgeable
 * client-side. It exists so signed-in users aren't shown an auth form;
 * protected content (once it exists) must enforce access on the server.
 *
 * The check is intentionally minimal (cookie existence + expiry) so the edge
 * bundle stays tiny; the localStorage session remains the client-side source
 * of truth for the header's session indicator.
 */

const SESSION_COOKIE_KEY = 'peoplelens_session';

export function middleware(request: NextRequest): NextResponse {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_KEY)?.value;

  if (sessionCookie && !isExpired(sessionCookie)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

function isExpired(cookieValue: string): boolean {
  try {
    const session = JSON.parse(cookieValue) as { expiresAt?: string };
    // No expiry claim → treat as valid. An invalid date must count as expired
    // (NaN comparisons are always false and would wrongly redirect).
    if (!session.expiresAt) return false;
    const expiresAt = new Date(session.expiresAt).getTime();
    return Number.isNaN(expiresAt) || expiresAt <= Date.now();
  } catch {
    // Malformed cookie — treat as signed out so the auth page stays reachable.
    return true;
  }
}

export const config = {
  matcher: ['/signin', '/signup'],
};
