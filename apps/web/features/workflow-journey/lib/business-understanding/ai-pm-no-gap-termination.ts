/**
 * DAY 8-I P0-2 — No meaningful gap → Judgment / Business Review (never re-ask stale question).
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import { isNextQuestionDecision } from './decide-next-question-from-review';
import {
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from './evaluate-stage-readiness';
import type { LivingUnderstandingState } from './living-understanding-state';
import { isSameMeaningQuestion } from './reframe-question';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';
import {
  createJudgmentBoundDecision,
} from './ai-pm-judgment-next-question-binding';

function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function priorAskedQuestions(turns: AiPmLoopTurn[]): string[] {
  const out: string[] = [];
  for (const t of turns) {
    if (t.superseded) continue;
    const q = t.askedQuestionText?.trim();
    if (q) out.push(normalizeQuestion(q));
  }
  return out;
}

/** True when this question text was already asked (exact or same meaning). */
export function isRepeatedQuestion(turns: AiPmLoopTurn[], questionText: string): boolean {
  const norm = normalizeQuestion(questionText);
  if (!norm) return false;
  return priorAskedQuestions(turns).some(
    (q) => q === norm || isSameMeaningQuestion(q, norm),
  );
}

/** V3 required gaps — same set Readiness / decideNextQuestionFromReview use. */
export const CANONICAL_V3_GAPS = [
  ...STAGE_A_REQUIRED_GAPS,
  ...STAGE_B_REQUIRED_GAPS,
] as const;

export function isCanonicalV3Gap(gapId: string): boolean {
  return (CANONICAL_V3_GAPS as readonly string[]).includes(gapId.trim());
}

function gapIdsForAskability(gapState: GapKnowledgeState): string[] {
  return [...new Set([...CANONICAL_V3_GAPS, ...Object.keys(gapState.gaps)])];
}

/**
 * True when no askable Canonical (or already-recorded) gap remains.
 * Missing keys are OPEN — same as `isGapAskable` / evaluateStageReadiness.
 */
export function hasNoAskableGap(gapState: GapKnowledgeState): boolean {
  for (const gapId of gapIdsForAskability(gapState)) {
    if (isGapAskable(gapId, gapState)) return false;
  }
  return true;
}

/** Valid next ask on an OPEN Canonical gap — termination must not discard it. */
export function isAskableCanonicalDecision(
  decision: NextQuestionDecision | null,
  gapState: GapKnowledgeState,
): boolean {
  if (!decision || !isNextQuestionDecision(decision)) return false;
  const gapId = decision.targetGapId?.trim() || decision.targetGap?.trim() || '';
  if (!gapId || !isCanonicalV3Gap(gapId)) return false;
  return isGapAskable(gapId, gapState);
}

/** True when adaptive selector finds no unresolved gap worth asking. */
export function hasNoMeaningfulGap(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
}): boolean {
  if (hasNoAskableGap(input.gapState)) return true;

  const closed = new Set<string>();
  for (const gapId of Object.keys(input.gapState.gaps)) {
    if (!isGapAskable(gapId, input.gapState)) closed.add(gapId);
  }

  const candidates = selectAdaptiveNextGaps(input.living, {
    excludeGaps: closed,
    turns: input.turns,
  });

  const askableFromCandidates = candidates.some((c) =>
    isGapAskable(c.fieldKey, input.gapState),
  );
  if (askableFromCandidates) return false;

  // Adaptive list empty but OPEN Canonical gaps remain — still meaningful.
  for (const gapId of gapIdsForAskability(input.gapState)) {
    if (isGapAskable(gapId, input.gapState)) return false;
  }

  return true;
}

export type NoGapTerminationVerdict = {
  terminate: boolean;
  reason: 'no_decision' | 'no_askable_gap' | 'repeat_loop_kill' | 'continue';
};

/**
 * When true, caller must NOT ask — switch to Judgment View / Business Review.
 * Absolute rule: never reuse an already-asked question when decision is null.
 */
export function evaluateNoGapTermination(input: {
  decision: NextQuestionDecision | null;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
}): NoGapTerminationVerdict {
  if (!input.decision) {
    return { terminate: true, reason: 'no_decision' };
  }

  if (!isNextQuestionDecision(input.decision)) {
    return { terminate: false, reason: 'continue' };
  }

  const q = input.decision.questionText?.trim() ?? '';
  if (!q) {
    return { terminate: true, reason: 'no_decision' };
  }

  if (isAskableCanonicalDecision(input.decision, input.gapState)) {
    return { terminate: false, reason: 'continue' };
  }

  if (isRepeatedQuestion(input.turns, q)) {
    return { terminate: true, reason: 'repeat_loop_kill' };
  }

  if (input.turns.length >= 4 && hasNoMeaningfulGap(input)) {
    return { terminate: true, reason: 'no_askable_gap' };
  }

  return { terminate: false, reason: 'continue' };
}

/** Returns null when ASK must stop — never fall back to stale question text. */
export function applyNoGapTermination(input: {
  decision: NextQuestionDecision | null;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
  judgment?: import('./ai-pm-ceo-judgment-dimensions').CeoJudgmentState | null;
}): NextQuestionDecision | null {
  const verdict = evaluateNoGapTermination(input);
  if (isAskableCanonicalDecision(input.decision, input.gapState)) {
    return input.decision;
  }
  if (!verdict.terminate) return input.decision;

  if (isAiPmJudgmentFix10V1Active() && input.judgment) {
    if (verdict.reason === 'no_askable_gap' && input.turns.length >= 4) {
      return null;
    }
    const bootstrap = createJudgmentBoundDecision(input.judgment);
    const q = bootstrap?.questionText?.trim() ?? '';
    if (q && !isRepeatedQuestion(input.turns, q)) {
      return bootstrap;
    }
  }

  return null;
}
