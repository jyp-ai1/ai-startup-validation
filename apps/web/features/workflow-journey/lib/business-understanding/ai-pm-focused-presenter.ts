/**
 * DAY 8-B — Focused 3-block presentation adapter.
 * Converts V3 engine output → CEO language (latest snapshot only).
 */

import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import type { LivingUnderstandingState } from './living-understanding-state';
import { runUnderstandingGate } from './ai-pm-understanding-gate';
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

function isPending(value: string | null | undefined): boolean {
  const v = value?.trim() ?? '';
  return !v || v === SHARED_UNDERSTANDING_PENDING;
}

function buildBusinessUnderstandingText(living: LivingUnderstandingState): string {
  const parts: string[] = [];

  const business = living.spine.business?.trim();
  if (!isPending(business)) {
    parts.push(business!);
  }

  const customer = living.spine.customer?.trim();
  if (!isPending(customer)) {
    parts.push(`대상: ${customer}`);
  }

  const problem = living.spine.problem?.trim();
  if (!isPending(problem)) {
    parts.push(`문제: ${problem}`);
  }

  if (parts.length === 0) {
    const oneLiner = living.claims.find(
      (c) => c.fieldKey === 'businessOneLiner' && c.value?.trim(),
    );
    if (oneLiner?.value?.trim()) {
      return oneLiner.value.trim();
    }
    return '아직 사업 설명을 확인 중입니다. 아래 질문에 답해 주시면 이해를 쌓겠습니다.';
  }

  return parts.join(' · ');
}

function buildConfirmPrompt(
  whyNow: string | null | undefined,
  lastDecision: NextQuestionDecision | null,
  gateRemaining: string | null,
): string {
  const fromWhy = whyNow?.trim() || lastDecision?.whyNow?.trim();
  if (fromWhy) return fromWhy;
  if (gateRemaining) return gateRemaining;
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

  let currentJudgment: string;
  if (gate?.whatChanged) {
    currentJudgment = gate.whatChanged;
  } else if (input.lastTurn?.understandingDelta?.trim()) {
    const delta = input.lastTurn.understandingDelta.trim();
    const withoutCoverage = delta.replace(/이해 상태 커버리지\s*\d+%[^·]*/g, '').trim();
    currentJudgment = withoutCoverage || input.living.judgmentSummary.slice(0, 200);
  } else {
    currentJudgment = input.living.judgmentSummary
      .replace(/\s*이해 상태 커버리지\s*\d+%[^.]*\./, '')
      .slice(0, 220)
      .trim();
  }

  if (!currentJudgment || currentJudgment.length < 4) {
    currentJudgment = '사업 이해를 쌓는 중입니다.';
  }

  const confirmPrompt = buildConfirmPrompt(
    input.whyNow,
    input.lastDecision,
    gate?.remainingUncertainty ?? null,
  );

  const questionText = input.displayQuestionText.trim() || '다음 확인이 필요합니다.';

  return {
    businessUnderstanding,
    currentJudgment,
    confirmPrompt,
    questionText,
  };
}
