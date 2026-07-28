'use client';

import { Suspense } from 'react';

import { AuthCompleteTracker } from '@/features/auth/components/auth-complete-tracker';

type WorkspaceAuthCompleteTrackerProps = {
  projectId?: string;
  promoted?: boolean;
  screen?: string;
};

/** Tracks OAuth return on workspace routes and strips ?auth=complete from URL. */
export function WorkspaceAuthCompleteTracker({
  projectId,
  promoted,
  screen = '/workspace',
}: WorkspaceAuthCompleteTrackerProps) {
  return (
    <Suspense fallback={null}>
      <AuthCompleteTracker screen={screen} projectId={projectId} promoted={promoted} />
    </Suspense>
  );
}
