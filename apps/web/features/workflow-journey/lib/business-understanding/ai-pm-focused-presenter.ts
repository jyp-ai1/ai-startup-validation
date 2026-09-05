/**
 * DAY 8-B — Focused 3-block presentation adapter.
 * Converts V3 engine output → CEO language (latest snapshot only).
 */

import type { NextQuestionDecision } from './decide-next-question-from-review';
import type { LivingUnderstandingState } from './living-understanding-state';
import { runUnderstandingGate } from './ai-pm-understanding-gate';
import {
  buildCeoJudgmentSnapshot,
  buildCeoUnderstandingSnapshot,
  sanitizeCeoFacingCopy,
} from './ai-pm-judgment-presenter';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type AiPmFocusedSnapshot = {
  /** AI가 이해한 현재 사업 */
  businessUnderstanding: string;
  /** 현재 판단 */
  currentJudgment: string;
  /** 지금 확인할 것 — why this question now */
  confirmPrompt: string;
  /** Concrete question text */
  questionText: string;
};

function buildBusinessUnderstandingText(living: LivingUnderstandingState): string {
  return sanitizeCeoFacingCopy(buildCeoUnderstandingSnapshot(living));
}

function buildConfirmPrompt(
  whyNow: string | null | undefined,
  lastDecision: NextQuestionDecision | null,
  gateRemaining: string | null,
  judgment: string,
): string {
  const fromWhy = whyNow?.trim() || lastDecision?.whyNow?.trim();
  if (fromWhy && !fromWhy.includes('targetGap') && !fromWhy.includes('CLOSED')) {
    return sanitizeCeoFacingCopy(fromWhy);
  }
  if (gateRemaining) return sanitizeCeoFacingCopy(gateRemaining);
  if (judgment.includes('불명확') || judgment.includes('확인')) {
    return judgment;
  }
  return '다음 판단을 위해 아래 내용을 확인하고 싶습니다.';
}

/**
 * Build latest CEO snapshot — no turn accumulation.
 */
export function buildAiPmFocusedSnapshot(input: {
  living: LivingUnderstandingState;
  livingBefore?: LivingUnderstandingState | null;
  lastTurn: AiPmLoopTurn | null;
  lastDecision: NextQuestionDecision | null;
  displayQuestionText: string;
  whyNow?: string | null;
}): AiPmFocusedSnapshot {
  const gate =
    input.livingBefore && input.lastTurn
      ? runUnderstandingGate({
          before: input.livingBefore,
          after: input.living,
          lastTurn: input.lastTurn,
        })
      : null;

  const businessUnderstanding = buildBusinessUnderstandingText(input.living);

  const currentJudgment = sanitizeCeoFacingCopy(
    buildCeoJudgmentSnapshot(input.living, gate),
  );

  const confirmPrompt = buildConfirmPrompt(
    input.whyNow,
    input.lastDecision,
    gate?.remainingUncertainty ?? null,
    currentJudgment,
  );

  const questionText = sanitizeCeoFacingCopy(
    input.displayQuestionText.trim() || '다음 확인이 필요합니다.',
  );

  return {
    businessUnderstanding,
    currentJudgment,
    confirmPrompt,
    questionText,
  };
}
