'use client';

import { useEffect } from 'react';

import { useRouter } from '@/i18n/navigation';

import { isV2ReturningUser } from '@/features/workflow-journey/lib/v2-workspace-home';

/** Returning users skip Landing — Home is Workspace list. */
export function V2ReturningHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isV2ReturningUser()) {
      router.replace('/workspaces');
    }
  }, [router]);

  return null;
}
