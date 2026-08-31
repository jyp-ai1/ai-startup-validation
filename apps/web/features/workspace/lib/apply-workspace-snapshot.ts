import {
  loadAiPmLoopState,
  saveAiPmLoopState,
} from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';
import type {
  AiPmLoopState,
  AiPmLoopTurn,
} from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import { saveUnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

const CACHE_META_KEY = (projectId: string) => `launchlens.workspace.${projectId}.dbUpdatedAt`;
const REVIEW_COUNT_KEY = (projectId: string) => `launchlens.reviewCount.${projectId}`;

function savePersistedReviewCountToCache(count: number, projectId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(REVIEW_COUNT_KEY(projectId), String(count));
}

function activeTurns(turns: AiPmLoopTurn[]): AiPmLoopTurn[] {
  return turns.filter((turn) => !turn.superseded);
}

function latestAppliedAt(turns: AiPmLoopTurn[]): string | null {
  const active = activeTurns(turns);
  if (active.length === 0) return null;
  return active.reduce(
    (max, turn) => (turn.appliedAt > max ? turn.appliedAt : max),
    active[0]!.appliedAt,
  );
}

/** True when client loop is strictly ahead of DB (post-answer before revalidate settles). */
export function isClientLoopAheadOfDb(client: AiPmLoopState, db: AiPmLoopState): boolean {
  const clientCount = activeTurns(client.turns).length;
  const dbCount = activeTurns(db.turns).length;
  if (clientCount > dbCount) return true;
  if (clientCount < dbCount) return false;
  if (clientCount === 0) return false;

  const clientLast = latestAppliedAt(client.turns);
  const dbLast = latestAppliedAt(db.turns);
  if (clientLast && dbLast) return clientLast > dbLast;
  return Boolean(clientLast && !dbLast);
}

/** Merge DB snapshot loop with client cache — client wins when ahead (FIX 1 CASE A). */
export function mergeAiPmLoopForHydrate(client: AiPmLoopState, db: AiPmLoopState): AiPmLoopState {
  if (isClientLoopAheadOfDb(client, db)) {
    return client;
  }

  return {
    ...db,
    readingCompleted: client.readingCompleted || db.readingCompleted,
    dismissedReadAck: client.dismissedReadAck || db.dismissedReadAck,
  };
}

/** DB snapshot → sessionStorage cache (never the other way on load). */
export function applyWorkspaceSnapshotToCache(
  projectId: string,
  snapshot: WorkspacePersistedSnapshot,
): void {
  if (typeof window === 'undefined' || !projectId) return;

  if (snapshot.documentText?.trim()) {
    saveWorkspaceDocumentText(snapshot.documentText, projectId);
  }

  const clientLoop = loadAiPmLoopState(projectId);
  const clientWasAhead =
    Boolean(snapshot.aiPmLoop) && isClientLoopAheadOfDb(clientLoop, snapshot.aiPmLoop!);

  if (snapshot.aiPmLoop) {
    const merged = mergeAiPmLoopForHydrate(clientLoop, snapshot.aiPmLoop);
    saveAiPmLoopState(merged, projectId);
  }

  if (snapshot.understandingPhase) {
    saveUnderstandingPhase(snapshot.understandingPhase, projectId);
  }

  if (typeof snapshot.reviewCount === 'number') {
    savePersistedReviewCountToCache(snapshot.reviewCount, projectId);
  }

  if (clientWasAhead) {
    const cachedAt = readWorkspaceCacheUpdatedAt(projectId);
    const nextMeta =
      cachedAt && cachedAt > snapshot.updatedAt ? cachedAt : new Date().toISOString();
    sessionStorage.setItem(CACHE_META_KEY(projectId), nextMeta);
  } else {
    sessionStorage.setItem(CACHE_META_KEY(projectId), snapshot.updatedAt);
  }
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
  if (typeof window === 'undefined') return true;

  const clientLoop = loadAiPmLoopState(projectId);
  const dbLoop = snapshot.aiPmLoop;

  // FIX 1 CASE A — post-answer: stale DB must not overwrite newer client turns
  if (dbLoop && isClientLoopAheadOfDb(clientLoop, dbLoop)) {
    return false;
  }

  // Resume: DB has durable turns when client cache is empty
  if ((dbLoop?.turns.length ?? 0) > 0) {
    if (activeTurns(clientLoop.turns).length === 0) return true;
    const cachedAt = readWorkspaceCacheUpdatedAt(projectId);
    if (!cachedAt) return true;
    return snapshot.updatedAt >= cachedAt;
  }

  const cachedAt = readWorkspaceCacheUpdatedAt(projectId);
  if (!cachedAt) return true;
  return snapshot.updatedAt >= cachedAt;
}
