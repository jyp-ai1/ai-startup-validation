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
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
