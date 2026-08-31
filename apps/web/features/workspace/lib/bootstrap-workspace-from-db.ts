import type { UnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

import {
  applyWorkspaceSnapshotToCache,
  shouldApplyDbSnapshot,
} from './apply-workspace-snapshot';

export type WorkspaceUiBootstrap = {
  understandingPhase: UnderstandingPhase;
  reviewCount: number;
  hasDocument: boolean;
  loopTurnCount: number;
};

/** DB snapshot → session cache mirror + UI bootstrap values. */
export function bootstrapWorkspaceFromDb(
  projectId: string,
  snapshot: WorkspacePersistedSnapshot | null | undefined,
): WorkspaceUiBootstrap {
  const defaults: WorkspaceUiBootstrap = {
    understandingPhase: 'pending',
    reviewCount: 0,
    hasDocument: false,
    loopTurnCount: 0,
  };

  if (!snapshot || !projectId) return defaults;

  if (typeof window !== 'undefined' && shouldApplyDbSnapshot(projectId, snapshot)) {
    applyWorkspaceSnapshotToCache(projectId, snapshot);
  }

  return {
    understandingPhase: snapshot.understandingPhase ?? 'pending',
    reviewCount: snapshot.reviewCount ?? 0,
    hasDocument: Boolean(snapshot.documentText?.trim()),
    loopTurnCount: snapshot.aiPmLoop?.turns.length ?? 0,
  };
}
