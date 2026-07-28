'use client';

import { Suspense } from 'react';

import { AuthCompleteTracker } from '@/features/auth/components/auth-complete-tracker';

type WorkspaceAuthCompleteTrackerProps = {
  projectId?: string;
  promoted?: boolean;
};

/** Tracks OAuth return on workspace routes and strips ?auth=complete from URL. */
export function WorkspaceAuthCompleteTracker({
  projectId,
  promoted,
}: WorkspaceAuthCompleteTrackerProps) {
  return (
    <Suspense fallback={null}>
      <AuthCompleteTracker screen="/workspace" projectId={projectId} promoted={promoted} />
    </Suspense>
  );
}
