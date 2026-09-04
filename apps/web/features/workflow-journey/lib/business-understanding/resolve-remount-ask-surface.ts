/**
 * PR6 — Remount display bind from persisted decision (S16/S17).
 * remount ≠ rerank — uses lastDecision.questionText as-is.
 */

import type { LockedAskSurface } from './question-transition-lock';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';

export type PersistedAskSurface = {
  issueId: LockedAskSurface['issueId'];
  targetGap: string;
  questionText: string;
  whyNow: string;
  rationale: string;
};

/** True when remount must bind from persisted artifacts, not live rank. */
export function shouldSkipLiveRankOnRemount(loop: AiPmLoopState): boolean {
  return Boolean(
    loop.lastDecision?.questionText?.trim() ||
      loop.lockedAskSurface?.questionText?.trim(),
  );
}

/**
 * Resolve visible ask surface from lockedAskSurface or lastDecision only.
 * Does NOT call decideNextQuestionFromReview or evaluateStageReadiness.
 */
export function resolveRemountAskSurface(loop: AiPmLoopState): PersistedAskSurface | null {
  const lock = loop.lockedAskSurface;
  if (lock?.questionText?.trim() && lock.targetGap?.trim()) {
    return {
      issueId: lock.issueId,
      targetGap: lock.targetGap.trim(),
      questionText: lock.questionText.trim(),
      whyNow: lock.whyNow?.trim() || lock.rationale?.trim() || '',
      rationale: lock.rationale?.trim() || lock.whyNow?.trim() || '',
    };
  }

  const decision = loop.lastDecision;
  if (!decision?.questionText?.trim()) return null;

  const targetGap =
    'targetGapId' in decision && decision.targetGapId
      ? decision.targetGapId
      : decision.targetGap;

  return {
    issueId: decision.issueId,
    targetGap: targetGap.trim(),
    questionText: decision.questionText.trim(),
    whyNow: decision.whyNow?.trim() || '',
    rationale:
      ('actionRationale' in decision && decision.actionRationale?.trim()) ||
      decision.rationale?.trim() ||
      decision.whyNow?.trim() ||
      '',
  };
}

/** Remount question text — lastDecision.questionText unchanged (V3-11). */
export function resolveRemountQuestionText(loop: AiPmLoopState): string | null {
  return resolveRemountAskSurface(loop)?.questionText ?? null;
}
