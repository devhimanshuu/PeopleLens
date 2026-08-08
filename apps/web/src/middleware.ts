import { type NextRequest, NextResponse } from 'next/server';

/**
 * Server-side route guards.
 *
 * - **Home** (`/`): the landing page is the marketing site for visitors;
 *   signed-in users are sent straight into the workspace so a fresh login
 *   never strands them on the public site.
 * - **App routes** (`/dashboard`, `/employees`, `/departments`, `/teams`,
 *   `/imports`, `/users`): redirect to `/signin` when no session marker cookie
 *   is present.
 * - **Auth pages** (`/signin`, `/signup`): redirect signed-in users home.
 * - **Admin route** (`/users`): additionally requires `role: admin` in the
 *   marker cookie; non-admins go to `/dashboard`.
 *
 * NOTE: the marker cookie is a UX guard, not a security boundary — it mirrors
 * the Neon session client-side. The API enforces real RBAC on every request.
 */
const SESSION_COOKIE_KEY = 'peoplelens_session';

const APP_ROUTES = [
  '/dashboard',
  '/employees',
  '/departments',
  '/teams',
  '/imports',
  '/users',
  '/audit-logs',
];
const ADMIN_ONLY_ROUTES = ['/users', '/audit-logs'];
const AUTH_PAGES = ['/signin', '/signup'];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_KEY)?.value;

  if (pathname === '/') {
    // Signed-in visitors get the workspace, not the marketing site. (The
    // marker cookie is only set by client-side JS, so a fresh OAuth callback
    // lands here before it exists — /signin's session-sync effect then
    // completes the hop to the dashboard.)
    if (sessionCookie && !isExpired(sessionCookie)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (AUTH_PAGES.includes(pathname)) {
    if (sessionCookie && !isExpired(sessionCookie)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (APP_ROUTES.includes(pathname)) {
    if (!sessionCookie || isExpired(sessionCookie)) {
      const url = new URL('/signin', request.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (ADMIN_ONLY_ROUTES.includes(pathname) && !hasRole(sessionCookie, 'admin')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

function hasRole(cookieValue: string, role: string): boolean {
  try {
    const session = JSON.parse(cookieValue) as { role?: string };
    return session.role === role;
  } catch {
    return false;
  }
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
  matcher: [
    '/',
    '/signin',
    '/signup',
    '/dashboard',
    '/employees',
    '/departments',
    '/teams',
    '/imports',
    '/users',
    '/audit-logs',
  ],
};
