/**
 * PR3 — Review → GapKnowledgeState transition (S13).
 * Applies gapVerdicts from AnswerReview without re-interpreting semantics.
 * @see docs/architecture/ai-pm-v3/readiness/V3_GAP_KNOWLEDGE_STATE_CONTRACT.md
 */

import type { AnswerReview, GapCompleteness, GapVerdict } from '@repo/types/domain/answer-review';
import type { GapKnowledgeRecord, GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

export function createEmptyGapState(): GapKnowledgeState {
  return { version: 1, gaps: {}, lastReviewByGap: {} };
}

/** Gap IDs with completeness CLOSED — fed to buildAnswerReview priorClosedGaps (PR2). */
export function getClosedGapIds(gapState: GapKnowledgeState): string[] {
  return Object.entries(gapState.gaps)
    .filter(([, record]) => record.completeness === 'CLOSED')
    .map(([gapId]) => gapId);
}

/**
 * CLOSED is monotonic — OPEN/PARTIAL cannot supersede CLOSED.
 * CONTRADICTED is the explicit exception (S12/S27).
 */
function shouldApplyVerdict(
  prev: GapKnowledgeRecord | undefined,
  nextCompleteness: GapCompleteness,
): boolean {
  if (!prev) return true;
  if (prev.completeness !== 'CLOSED') return true;
  return nextCompleteness === 'CONTRADICTED' || nextCompleteness === 'CLOSED';
}

function confidenceFromFacts(
  review: AnswerReview,
  gapId: string,
): GapKnowledgeRecord['confidence'] {
  const facts = review.extractedFacts.filter((f) => f.targetGap === gapId);
  if (facts.some((f) => f.confidence === 'high')) return 'high';
  if (facts.some((f) => f.confidence === 'medium')) return 'medium';
  if (facts.length > 0) return 'low';
  return 'medium';
}

function buildRecordFromVerdict(
  review: AnswerReview,
  verdict: GapVerdict,
): GapKnowledgeRecord {
  const evidence = review.extractedFacts
    .filter((f) => f.targetGap === verdict.gapId)
    .map((f) => ({
      factKey: f.key,
      value: f.value,
      evidenceClass: f.evidenceClass,
    }));

  return {
    gapId: verdict.gapId,
    completeness: verdict.completeness,
    sourceTurnId: review.turnId,
    sourceReviewId: review.reviewId,
    evidence,
    confidence: confidenceFromFacts(review, verdict.gapId),
    lastUpdated: review.createdAt,
    rationale: verdict.rationale,
  };
}

/**
 * Merge review gapVerdicts into aggregate gapState.
 * Applies ALL gapVerdicts (V3-07 multi-gap). Gaps absent from review are unchanged (V3-08).
 */
export function updateGapStateFromReview(
  review: AnswerReview,
  currentGapState: GapKnowledgeState,
): GapKnowledgeState {
  const gaps = { ...currentGapState.gaps };
  const lastReviewByGap = { ...currentGapState.lastReviewByGap };

  for (const verdict of Object.values(review.gapVerdicts)) {
    const prev = gaps[verdict.gapId];
    if (!shouldApplyVerdict(prev, verdict.completeness)) {
      continue;
    }
    gaps[verdict.gapId] = buildRecordFromVerdict(review, verdict);
    lastReviewByGap[verdict.gapId] = review.reviewId;
  }

  return {
    version: 1,
    gaps,
    lastReviewByGap,
  };
}

/** Latest persisted verdict for a gap — null when never reviewed. */
export function latestVerdictForGap(
  gapId: string,
  gapState: GapKnowledgeState,
): GapVerdict | null {
  const record = gapState.gaps[gapId];
  if (!record) return null;
  return {
    gapId: record.gapId,
    completeness: record.completeness,
    rationale: record.rationale,
    factKeys: record.evidence.map((e) => e.factKey),
  };
}

/** CLOSED gaps are excluded from candidate set (S13 §6). CONTRADICTED remains askable. */
export function isGapAskable(gapId: string, gapState: GapKnowledgeState): boolean {
  const record = gapState.gaps[gapId];
  if (!record) return true;
  return record.completeness !== 'CLOSED';
}

/** Replay reviews in order — used for hydrate/backfill (PR6). */
export function aggregateGapState(reviews: AnswerReview[]): GapKnowledgeState {
  let state = createEmptyGapState();
  for (const review of reviews) {
    state = updateGapStateFromReview(review, state);
  }
  return state;
}
