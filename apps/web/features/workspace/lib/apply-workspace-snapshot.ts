import { saveAiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';
import { saveUnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import { savePersistedReviewCount } from '@/features/workflow-journey/lib/demo-guided-session';
import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

const CACHE_META_KEY = (projectId: string) => `launchlens.workspace.${projectId}.dbUpdatedAt`;

/** DB snapshot → sessionStorage cache (never the other way on load). */
export function applyWorkspaceSnapshotToCache(
  projectId: string,
  snapshot: WorkspacePersistedSnapshot,
): void {
  if (typeof window === 'undefined' || !projectId) return;

  if (snapshot.documentText?.trim()) {
    saveWorkspaceDocumentText(snapshot.documentText, projectId);
  }

  if (snapshot.aiPmLoop) {
    saveAiPmLoopState(snapshot.aiPmLoop, projectId);
  }

  if (snapshot.understandingPhase) {
    saveUnderstandingPhase(snapshot.understandingPhase, projectId);
  }

  if (typeof snapshot.reviewCount === 'number') {
    savePersistedReviewCount(snapshot.reviewCount, projectId);
  }

  sessionStorage.setItem(CACHE_META_KEY(projectId), snapshot.updatedAt);
}

export function readWorkspaceCacheUpdatedAt(projectId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(CACHE_META_KEY(projectId));
}

/** True when DB snapshot should replace stale client cache. */
export function shouldApplyDbSnapshot(
  projectId: string,
  snapshot: WorkspacePersistedSnapshot,
): boolean {
  // TTAEJYO CASE B — resume: server loop state beats stale sessionStorage timestamps
  if ((snapshot.aiPmLoop?.turns.length ?? 0) > 0) {
    return true;
  }
  const cachedAt = readWorkspaceCacheUpdatedAt(projectId);
  if (!cachedAt) return true;
  return snapshot.updatedAt >= cachedAt;
}
