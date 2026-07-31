'use client';

import { getBrowserClient, isSupabaseBrowserConfigured } from '@repo/db';

import { clearAllDemoClientState } from '@/features/workflow-journey/lib/demo-guided-session';
import { clearAllLaunchLensClientState } from '@/lib/project/project-context-store';

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
export async function signOutAndRedirect(next = '/'): Promise<void> {
  if (typeof window !== 'undefined') {
    clearAllDemoClientState();
    clearAllLaunchLensClientState();
  }
  await signOutBrowserSession();
  window.location.assign(`/auth/logout?next=${encodeURIComponent(next)}`);
}
