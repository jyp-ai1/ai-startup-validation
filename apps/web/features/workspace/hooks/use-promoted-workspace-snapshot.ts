'use client';

import { useLayoutEffect, useState } from 'react';

import { applyWorkspaceSnapshotToCache } from '@/features/workspace/lib/apply-workspace-snapshot';
import { loadDemoWorkflowSnapshot } from '@/features/workflow-journey/lib/v2-demo-project-store';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

/** Demo OAuth promote — hydrate sessionStorage snapshot into the new owned project cache. */
export function usePromotedWorkspaceSnapshot(
  projectId: string,
  promoted: boolean,
  serverSnapshot: WorkspacePersistedSnapshot | null,
): WorkspacePersistedSnapshot | null {
  const [snapshot, setSnapshot] = useState<WorkspacePersistedSnapshot | null>(serverSnapshot);

  useLayoutEffect(() => {
    if (!promoted) {
      setSnapshot(serverSnapshot);
      return;
    }

    const demoSnapshot = loadDemoWorkflowSnapshot()?.v2Workspace ?? null;
    if (demoSnapshot) {
      applyWorkspaceSnapshotToCache(projectId, demoSnapshot);
      setSnapshot(demoSnapshot);
      return;
    }

    setSnapshot(serverSnapshot);
  }, [projectId, promoted, serverSnapshot]);

  return snapshot;
}
