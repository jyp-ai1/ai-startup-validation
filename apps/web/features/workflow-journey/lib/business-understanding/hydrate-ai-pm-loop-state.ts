/**
 * PR6 — Persisted state hydration (S16).
 * Restores gapState, lastDecision, lockedAskSurface without live ranking.
 * @see docs/architecture/ai-pm-v3/readiness/V3_PERSISTENCE_HYDRATION_CONTRACT.md
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type { AiPmLoopState, AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import {
  aggregateGapState,
  createEmptyGapState,
  getClosedGapIds,
} from './update-gap-state-from-review';

/** Union turns by appliedAt; client review wins on conflict (S16 I3). */
export function mergeTurnsPreservingReview(
  client: AiPmLoopTurn[],
  db: AiPmLoopTurn[],
): AiPmLoopTurn[] {
  const byAppliedAt = new Map<string, AiPmLoopTurn>();

  for (const turn of db) {
    if (turn.superseded) continue;
    byAppliedAt.set(turn.appliedAt, turn);
  }

  for (const turn of client) {
    const existing = byAppliedAt.get(turn.appliedAt);
    if (!existing) {
      byAppliedAt.set(turn.appliedAt, turn);
      continue;
    }
    byAppliedAt.set(turn.appliedAt, {
      ...existing,
      ...turn,
      review: turn.review ?? existing.review,
    });
  }

  return [...byAppliedAt.values()].sort((a, b) => a.appliedAt.localeCompare(b.appliedAt));
}

function collectReviewsFromTurns(turns: AiPmLoopTurn[]): AnswerReview[] {
  return turns
    .filter((t) => !t.superseded && t.review)
    .sort((a, b) => a.appliedAt.localeCompare(b.appliedAt))
    .map((t) => t.review!);
}

/**
 * CLOSED gaps from persisted state must not regress on hydrate (S16 I1).
 */
export function mergeGapStateMonotonic(
  persisted: GapKnowledgeState | undefined,
  replayed: GapKnowledgeState,
): GapKnowledgeState {
  if (!persisted) return replayed;

  const gaps = { ...replayed.gaps };
  const lastReviewByGap = { ...replayed.lastReviewByGap };

  for (const [gapId, record] of Object.entries(persisted.gaps)) {
    const replayedRecord = gaps[gapId];
    if (record.completeness !== 'CLOSED') continue;
    if (!replayedRecord || replayedRecord.completeness !== 'CLOSED') {
      gaps[gapId] = record;
      lastReviewByGap[gapId] =
        persisted.lastReviewByGap[gapId] ?? record.sourceReviewId;
    }
  }

  return { version: 1, gaps, lastReviewByGap };
}

export type HydrateAiPmLoopInput = {
  /** Post mergeAiPmLoopForHydrate state */
  merged: AiPmLoopState;
  client: AiPmLoopState;
  db: AiPmLoopState;
};

/**
 * Hydrate persisted artifacts — NO live ranking or semantic re-interpretation.
 */
export function hydrateAiPmLoopState(input: HydrateAiPmLoopInput): AiPmLoopState {
  const turns = mergeTurnsPreservingReview(input.client.turns, input.db.turns);
  const reviews = collectReviewsFromTurns(turns);
  const replayedGapState =
    reviews.length > 0 ? aggregateGapState(reviews) : createEmptyGapState();

  const persistedGap =
    input.merged.gapState ?? input.client.gapState ?? input.db.gapState;
  const gapState = mergeGapStateMonotonic(persistedGap, replayedGapState);

  const lastDecision =
    input.merged.lastDecision ??
    input.client.lastDecision ??
    input.db.lastDecision;

  const lockedAskSurface =
    input.merged.lockedAskSurface ??
    input.client.lockedAskSurface ??
    input.db.lockedAskSurface ??
    null;

  return {
    ...input.merged,
    turns,
    gapState,
    lastDecision,
    lockedAskSurface,
  };
}

/** Trace helper — CLOSED gap ids preserved after hydrate replay. */
export function assertHydrateClosedPreserved(
  before: GapKnowledgeState | undefined,
  after: GapKnowledgeState,
): { preserved: boolean; closedGapIds: string[] } {
  const closedBefore = before ? getClosedGapIds(before) : [];
  const closedAfter = getClosedGapIds(after);
  const preserved = closedBefore.every((gapId) => closedAfter.includes(gapId));
  return { preserved, closedGapIds: closedAfter };
}
