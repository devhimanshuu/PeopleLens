'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { syncOAuthSession } from '@/lib/auth';

/**
 * Redirects signed-in visitors away from the marketing site into the
 * workspace.
 *
 * This is the safety net for the OAuth handshake. When Neon Auth finishes a
 * Google/GitHub sign-in it lands the browser back on the app with a
 * `neon_auth_session_verifier` query param — the app must call `getSession()`
 * while that param is in the URL to actually establish the session. If the
 * callback lands on `/` (the marketing page) nothing used to consume it, so
 * the user appeared "signed in to the provider" but was stranded on the
 * landing page. Mounting this sync here completes the handshake and bounces
 * into `/dashboard`.
 *
 * The edge middleware already redirects visitors whose marker cookie exists;
 * this covers the fresh-callback case where the marker does not exist yet.
 * It renders nothing and never blocks the marketing content for visitors.
 */
export function SignedInRedirect() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await syncOAuthSession();
      if (!cancelled && session) {
        router.replace('/dashboard');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
