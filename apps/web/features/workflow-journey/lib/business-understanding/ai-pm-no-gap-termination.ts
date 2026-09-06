/**
 * DAY 8-I P0-2 — No meaningful gap → Judgment / Business Review (never re-ask stale question).
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import { isNextQuestionDecision } from './decide-next-question-from-review';
import type { LivingUnderstandingState } from './living-understanding-state';
import { isSameMeaningQuestion } from './reframe-question';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

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

/** True when no askable gap remains in gapState. */
export function hasNoAskableGap(gapState: GapKnowledgeState): boolean {
  for (const gapId of Object.keys(gapState.gaps)) {
    if (isGapAskable(gapId, gapState)) return false;
  }
  return true;
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

  // Adaptive list empty but OPEN gaps remain — still meaningful (bootstrap path).
  for (const gapId of Object.keys(input.gapState.gaps)) {
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
}): NextQuestionDecision | null {
  const verdict = evaluateNoGapTermination(input);
  if (verdict.terminate) return null;
  return input.decision;
}
