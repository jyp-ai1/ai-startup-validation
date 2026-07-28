'use client';

import { getBrowserClient, isSupabaseBrowserConfigured } from '@repo/db';

/** Clear browser-side Supabase session before server logout route runs. */
export async function signOutBrowserSession(): Promise<void> {
  if (!isSupabaseBrowserConfigured()) return;

  try {
    const client = getBrowserClient();
    await client.auth.signOut({ scope: 'global' });
  } catch (error) {
    console.warn('[auth] browser signOut failed', error);
  }
}

/** Full logout — browser cache first, then server cookie purge via route handler. */
export async function signOutAndRedirect(next = '/auth/login?signed_out=1'): Promise<void> {
  await signOutBrowserSession();
  window.location.assign(`/auth/logout?next=${encodeURIComponent(next)}`);
}
