'use client';

import { useEffect } from 'react';

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://mountsea.ai' : 'http://localhost:4300');

export const SSO_SILENT_KEY = 'sso_silent_tried';

/**
 * Runs a one-shot silent SSO check per browser session.
 *
 * If the user is not logged into ai-studio but IS logged into api-web
 * (Mountsea), this component transparently redirects through the SSO flow
 * with prompt=none and auto-logs them in.
 *
 * If api-web has no active session, the callback page handles the
 * `error=not_authenticated` response and just returns the user to their
 * current page — no visible interruption.
 *
 * The check is skipped on subsequent page loads within the same browser
 * session (sessionStorage flag) to avoid repeated redirects.
 */
export function SilentSsoCheck() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Read auth state directly from localStorage (synchronous) instead of
    // Zustand store to avoid the persist-hydration race condition.
    // Zustand's persist middleware may not have rehydrated yet when this
    // effect fires, causing isAuthenticated to read as false even for logged-in
    // users — which would incorrectly trigger the silent SSO redirect.
    const hasToken =
      !!localStorage.getItem('access_token') ||
      !!localStorage.getItem('refresh_token');
    if (hasToken) return;

    if (sessionStorage.getItem(SSO_SILENT_KEY)) return;

    sessionStorage.setItem(SSO_SILENT_KEY, '1');

    const callbackUrl = `${window.location.origin}/auth/sso-callback`;
    const ssoUrl = new URL(`${AUTH_BASE_URL}/auth/sso`);
    ssoUrl.searchParams.set('redirect_uri', callbackUrl);
    ssoUrl.searchParams.set('prompt', 'none');
    ssoUrl.searchParams.set('state', encodeURIComponent(window.location.pathname + window.location.search));

    window.location.href = ssoUrl.toString();
  }, []); // intentionally mount-only — see comment in auth.store.ts logout()

  return null;
}
