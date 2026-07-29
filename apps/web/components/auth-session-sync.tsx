'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { getBrowserClient, isSupabaseBrowserConfigured } from '@repo/db';

/** Keeps client auth cache aligned with SSR cookies (logout, OAuth callback). */
export function AuthSessionSync() {
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) return undefined;

    const client = getBrowserClient();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.refresh();
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // OAuth callback already resolves final /workspace?project= — skip mid-flow refresh flash
        if (event === 'SIGNED_IN' && window.location.search.includes('auth=complete')) {
          return;
        }
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
