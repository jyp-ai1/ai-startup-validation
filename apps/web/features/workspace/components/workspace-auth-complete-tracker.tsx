'use client';

import { Suspense } from 'react';

import { AuthCompleteTracker } from '@/features/auth/components/auth-complete-tracker';

/** Tracks OAuth return on /workspace and strips ?auth=complete from URL. */
export function WorkspaceAuthCompleteTracker() {
  return (
    <Suspense fallback={null}>
      <AuthCompleteTracker screen="/workspace" />
    </Suspense>
  );
}
