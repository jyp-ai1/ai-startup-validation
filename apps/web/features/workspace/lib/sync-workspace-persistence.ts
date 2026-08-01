import type { AiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import type { UnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import { buildWorkspacePersistedFacts } from '@/features/workflow-journey/lib/business-understanding/build-workspace-ai-pm-state';
import { loadAiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';
import { loadUnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import { loadPersistedReviewCount } from '@/features/workflow-journey/lib/demo-guided-session';
import { loadWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

import { applyWorkspaceSnapshotToCache } from './apply-workspace-snapshot';
import { persistWorkspaceSnapshotAction } from '../actions/workspace-persistence-actions';

type SyncWorkspacePersistenceOptions = {
  projectId: string;
  enabled?: boolean;
};

export function buildWorkspacePersistedSnapshot(projectId: string): WorkspacePersistedSnapshot {
  const documentText = loadWorkspaceDocumentText(projectId) ?? undefined;
  const aiPmLoop = loadAiPmLoopState(projectId);
  const reviewCount = loadPersistedReviewCount(projectId);
  const workspaceFacts = buildWorkspacePersistedFacts({
    documentText,
    loop: aiPmLoop,
    reviewCount,
  });

  return {
    documentText,
    aiPmLoop,
    workspaceFacts,
    understandingPhase: loadUnderstandingPhase(projectId),
    reviewCount,
    updatedAt: new Date().toISOString(),
  };
}

/** Persist DB first, then mirror session cache — not cache-first. */
export async function persistWorkspaceStateDbFirst({
  projectId,
  enabled = true,
}: SyncWorkspacePersistenceOptions): Promise<boolean> {
  if (!enabled || typeof window === 'undefined' || !projectId) return false;

  const snapshot = buildWorkspacePersistedSnapshot(projectId);
  if (
    !snapshot.documentText &&
    snapshot.reviewCount === 0 &&
    (snapshot.aiPmLoop?.turns.length ?? 0) === 0
  ) {
    return false;
  }

  const result = await persistWorkspaceSnapshotAction({ projectId, snapshot });
  if (!result.ok) return false;

  applyWorkspaceSnapshotToCache(projectId, snapshot);
  return true;
}

/** @deprecated Use persistWorkspaceStateDbFirst */
export const syncWorkspacePersistence = persistWorkspaceStateDbFirst;

export type { WorkspacePersistedSnapshot, AiPmLoopState, UnderstandingPhase };
