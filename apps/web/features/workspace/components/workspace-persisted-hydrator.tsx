'use client';

import { useLayoutEffect } from 'react';

import {
  applyWorkspaceSnapshotToCache,
  shouldApplyDbSnapshot,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

type WorkspacePersistedHydratorProps = {
  projectId: string;
  snapshot: WorkspacePersistedSnapshot | null;
};

/**
 * DB → Workspace cache on entry.
 * Source of truth: onboardingContext.v2Workspace (server).
 * sessionStorage: cache mirror only.
 */
export function WorkspacePersistedHydrator({ projectId, snapshot }: WorkspacePersistedHydratorProps) {
  useLayoutEffect(() => {
    if (!snapshot || !shouldApplyDbSnapshot(projectId, snapshot)) return;
    applyWorkspaceSnapshotToCache(projectId, snapshot);
  }, [projectId, snapshot]);

  return null;
}
