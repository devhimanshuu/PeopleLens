/**
 * Auth facade for PeopleLens, backed by Neon Auth (Managed Better Auth).
 *
 * The Better Auth session lives in its own HTTP-only cookies (set via the
 * /api/auth proxy). We additionally mirror a minimal marker into localStorage
 * + a plain cookie so the header indicator and the edge middleware guard on
 * /signin & /signup keep working without touching the auth server.
 */

import { authClient } from '@/lib/auth/client';
import type { Role } from '@peoplelens/types';

export interface NeonUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt?: string;
}

export interface NeonSession {
  user: NeonUser;
  token?: string;
  expiresAt?: string;
  /** Platform RBAC role — resolved from the API after sign-in. */
  role?: Role;
}

export type OAuthProvider = 'google' | 'github';

const SESSION_STORAGE_KEY = 'peoplelens_session';

/** Mirrors the session to a cookie so server-side middleware can read it (Edge runtime has no localStorage). */
const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** Get current stored session from localStorage / cookies if in browser */
export function getStoredSession(): NeonSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NeonSession;
  } catch {
    return null;
  }
}

/**
 * Store session locally in browser (and mirror it to a cookie for the
 * server-side middleware guard on /signin and /signup).
 */
export function setStoredSession(session: NeonSession | null) {
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  syncSessionCookie(session);
}

/**
 * Mirrors a minimal session marker to a cookie so Next.js middleware (Edge
 * runtime — no localStorage) can redirect signed-in users away from auth
 * pages server-side. The full session stays in localStorage; the cookie only
 * carries identity + expiry. SameSite=Lax: only needed for same-site
 * navigation. `Secure` is added automatically over https.
 */
function syncSessionCookie(session: NeonSession | null): void {
  if (typeof document === 'undefined') return;
  const base = `${SESSION_STORAGE_KEY}=`;
  if (!session) {
    document.cookie = `${base}; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  const marker = JSON.stringify({
    id: session.user.id,
    email: session.user.email,
    ...(session.role ? { role: session.role } : {}),
    ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
  });
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${base}${encodeURIComponent(marker)}; Path=/; Max-Age=${SESSION_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function toNeonSession(
  user: { id: string; name?: string | null; email: string; image?: string | null },
  token?: string | null,
  expiresAt?: Date | string | null,
): NeonSession {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? undefined,
      image: user.image ?? undefined,
    },
    token: token ?? undefined,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
  };
}

/**
 * Pull the current session from the Better Auth server and mirror it into the
 * local session marker. Returns the session (or null when signed out).
 *
 * Used after OAuth redirects and on 401-refresh so the header + middleware
 * see the new session. Preserves any previously resolved role.
 *
 * Robustness rule: a TRANSIENT failure (network error / auth server down)
 * must never destroy a valid stored session — we keep the local marker and
 * return it so the user stays signed in. Only an explicit "no session"
 * response (or a fatal error with no stored session) clears the marker.
 */
export async function syncOAuthSession(): Promise<NeonSession | null> {
  if (typeof window === 'undefined') return null;
  const previous = getStoredSession();
  try {
    const { data, error } = await authClient.getSession();
    // `getSession` returns `{ session, user }` — the user is top-level, not on the session.
    if (error) {
      // Auth server unreachable — keep any existing session rather than
      // signing the user out because of a network blip.
      return previous;
    }
    if (!data?.user) {
      setStoredSession(null);
      return null;
    }
    const session = toNeonSession(data.user, data.session?.token, data.session?.expiresAt);
    if (previous?.role) session.role = previous.role;
    setStoredSession(session);
    return session;
  } catch {
    // Unexpected client failure — preserve an existing stored session.
    return previous;
  }
}

/** Updates the stored session's RBAC role (resolved from the API profile). */
export function setStoredRole(role: Role): void {
  const session = getStoredSession();
  if (!session) return;
  session.role = role;
  setStoredSession(session);
}

/** Sign in with Email and Password via Managed Better Auth */
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<{ session?: NeonSession; error?: string }> {
  try {
    const { data, error } = await authClient.signIn.email({ email, password });
    if (error) return { error: error.message || 'Failed to sign in' };
    if (!data?.user) return { error: 'Failed to sign in' };
    const session = toNeonSession(data.user, data.token);
    setStoredSession(session);
    return { session };
  } catch {
    return { error: 'Could not reach the authentication service. Please try again.' };
  }
}

/**
 * Register a new user with Email, Password, and Name via Managed Better Auth.
 *
 * When Neon Auth requires email verification, sign-up succeeds but NO session
 * is issued — redirecting to the workspace would dead-end, so this surfaces a
 * clear "verify your email" message instead.
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string,
): Promise<{ session?: NeonSession; error?: string }> {
  try {
    const { data, error } = await authClient.signUp.email({
      email,
      password,
      name: name || email.split('@')[0] || 'User',
    });
    if (error) return { error: error.message || 'Failed to register' };
    if (!data?.user) return { error: 'Failed to register' };
    if (!data.token) {
      // Neon issues no session until the email is verified — keep the message
      // vendor-neutral for end users; setup guidance lives in the README and
      // on the sign-in page.
      return { error: 'Account created — please verify your email, then sign in.' };
    }
    const session = toNeonSession(data.user, data.token);
    setStoredSession(session);
    return { session };
  } catch {
    return { error: 'Could not reach the authentication service. Please try again.' };
  }
}

/**
 * Start an OAuth sign-in with Google or GitHub. The SDK redirects the browser
 * to the provider; on success Managed Better Auth lands the user back on
 * `callbackURL` with a session established. Defaults to the workspace
 * dashboard — landing on the public marketing page after login would show the
 * landing site to a signed-in user.
 */
export async function signInWithOAuth(
  provider: OAuthProvider,
  callbackURL = '/dashboard',
): Promise<{ error?: string }> {
  try {
    await authClient.signIn.social({ provider, callbackURL });
    return {};
  } catch {
    return { error: 'Could not start sign-in. Check that the provider is enabled in Neon Auth.' };
  }
}

/** Sign out from Managed Better Auth and clear the local session marker */
export async function signOutNeon(): Promise<void> {
  try {
    await authClient.signOut();
  } catch {
    // Still clear the local marker below — the server session may already be gone.
  } finally {
    setStoredSession(null);
  }
}
