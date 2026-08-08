// Auth facade for PeopleLens, backed by Neon Auth (Managed Better Auth). The Better Auth session lives in its…
// own HTTP-only cookies (set via the /api/auth proxy). We additionally mirror a minimal marker into…

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

// The raw session token is kept ONLY in module memory. Persisting it to localStorage would hand an XSS attacker…
// a credential that outlives the page; the API accepts the HttpOnly `__Secure-neon-auth.*` cookie anyway (sent…
let memoryToken: string | undefined;

/** Get current stored session from localStorage / cookies if in browser */
export function getStoredSession(): NeonSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as NeonSession;
    // Rehydrate the in-memory token for the current page load so the Bearer
    // header keeps working until refresh (when the cookie takes over).
    session.token = memoryToken;
    return session;
  } catch {
    return null;
  }
}
// Store session locally in browser (and mirror it to a cookie for the server-side middleware guard on /signin…
// and /signup). The raw token never touches localStorage — see `memoryToken` above.
export function setStoredSession(session: NeonSession | null) {
  memoryToken = session?.token;
  if (typeof window === 'undefined') return;
  if (!session) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } else {
    const marker = { ...session };
    delete marker.token;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(marker));
  }
  syncSessionCookie(session);
}
// Mirrors a minimal session marker to a cookie so Next.js middleware (Edge runtime — no localStorage) can…
// redirect signed-in users away from auth pages server-side. The full session stays in localStorage; the cookie…
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
// Pull the current session from the Better Auth server and mirror it into the local session marker. Returns the…
// session (or null when signed out). Used after OAuth redirects and on 401-refresh so the header + middleware…
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
    // The SDK returns the session token top-level on email sign-in
    // (`{ token, user }`); `session` only exists on getSession responses.
    if (!data.token) return { error: 'Failed to sign in' };
    const session = toNeonSession(data.user, data.token);
    setStoredSession(session);
    return { session };
  } catch {
    return { error: 'Could not reach the authentication service. Please try again.' };
  }
}
// Register a new user with Email, Password, and Name via Managed Better Auth. When Neon Auth requires email…
// verification, sign-up succeeds but NO session is issued — redirecting to the workspace would dead-end, so…
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
      // Neon issues no session until the email is verified — keep the message vendor-neutral for end users; setup…
      // guidance lives in the README and on the sign-in page.
      return { error: 'Account created — please verify your email, then sign in.' };
    }
    const session = toNeonSession(data.user, data.token);
    setStoredSession(session);
    return { session };
  } catch {
    return { error: 'Could not reach the authentication service. Please try again.' };
  }
}
// Start an OAuth sign-in with Google or GitHub. The SDK redirects the browser to the provider; on success…
// Managed Better Auth lands the user back on `callbackURL` with a session established. Defaults to the…
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

/**
 * Start the password-reset flow: Managed Better Auth sends a reset link to the
 * address (when the account exists and email delivery is configured). Returns
 * a generic success so we never leak which emails are registered.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await authClient.requestPasswordReset({ email });
    if (error) return { ok: false, error: error.message || 'Could not start password reset' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the authentication service. Please try again.' };
  }
}

/**
 * Complete the password reset with the token from the emailed link and a new
 * password. On success the user can sign in with the new password.
 */
export async function resetPasswordWithToken(
  newPassword: string,
  token?: string | null,
): Promise<{ ok: boolean; error?: string }> {
  if (!token) return { ok: false, error: 'This reset link is invalid or expired.' };
  try {
    const { error } = await authClient.resetPassword({ newPassword, token });
    if (error) return { ok: false, error: error.message || 'Could not reset your password' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the authentication service. Please try again.' };
  }
}
