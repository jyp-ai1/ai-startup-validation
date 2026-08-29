/**
 * Loop 7 — resolve the Living gap that was asked before persisting a turn.
 * Production adaptive path must never append turns without targetGap — wrong-slot
 * detection (`detectWrongSlotMergeContext`) requires it on the last mergeable turn.
 */

import { inferTargetGapFromQuestionText, resolveGapQuestionBinding } from './gap-question-map';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const INVALID_GAP = new Set(['', 'unknown']);

function cleanGap(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || INVALID_GAP.has(trimmed)) return null;
  return trimmed;
}

/** Infer asked gap from a persisted turn (legacy / production shapes missing targetGap). */
export function inferAskedTargetGapFromTurn(turn: AiPmLoopTurn): string | null {
  const fromStoredQuestion = inferTargetGapFromQuestionText(turn.askedQuestionText);
  if (fromStoredQuestion) return fromStoredQuestion;

  const direct = cleanGap(turn.targetGap);
  if (direct) return direct;

  const fromMeta = cleanGap(turn.unresolvedGap) ?? cleanGap(turn.causality?.unresolvedGap);
  if (fromMeta) return fromMeta;

  const fromIssue = resolveGapQuestionBinding(null, turn.issueId).targetGap;
  return cleanGap(fromIssue);
}

/** Resolve gap asked on the active UI surface before append / interpret. */
export function resolveAskedTargetGapForAppend(input: {
  issueId: AiPmLoopIssueId;
  whyTargetGap?: string | null;
  overrideTargetGap?: string | null;
  questionText?: string | null;
  fallbackTargetGap?: string | null;
}): string {
  // Loop 9 — visible question text is ground truth; beats stale override from prior partial
  // reframe (T11 validationTestability PARTIAL → T12 persona ask @ a9ebd63 live P0-1).
  const fromQuestion = inferTargetGapFromQuestionText(input.questionText);
  if (fromQuestion) return fromQuestion;

  // Loop 8 — active reframe override beats stale whyTargetGap when question text unavailable
  const fromOverride = cleanGap(input.overrideTargetGap);
  if (fromOverride) return fromOverride;

  const fromWhy = cleanGap(input.whyTargetGap);
  if (fromWhy) return fromWhy;

  const fromFallback = cleanGap(input.fallbackTargetGap);
  if (fromFallback) return fromFallback;

  return resolveGapQuestionBinding(null, input.issueId).targetGap;
}
