/**
 * PR #197 — T7 next-question policy.
 * customer+problem CLOSED and payer OPEN → next=payer, not FIX-10 solution.
 */
import { describe, expect, it } from 'vitest';

import { applyAntiRepeatPolicy } from '../ai-pm-anti-repeat-policy';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import {
  applyJudgmentNextQuestionBinding,
  shouldHoldOpenStageAPayer,
} from '../ai-pm-judgment-next-question-binding';
import type { NextQuestionDecision } from '../decide-next-question-from-review';
import { createEmptyGapState } from '../update-gap-state-from-review';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import type { LivingUnderstandingState } from '../living-understanding-state';

const PAYER_Q =
  '이 문제를 해결할 때, 실제로 비용을 지불하거나 도입을 결정하는 사람은 누구인가요?';
const SOLUTION_Q = '문제를 해결하는 방식(제공 가치)은 무엇인가요?';

function closed(gapId: string) {
  return {
    gapId,
    completeness: 'CLOSED' as const,
    sourceTurnId: 't',
    sourceReviewId: 'r',
    evidence: [],
    confidence: 'high' as const,
    lastUpdated: '2026-10-13T00:00:00.000Z',
    rationale: 'closed',
  };
}

function gapStateCustomerProblemClosedPayerOpen() {
  const state = createEmptyGapState();
  state.gaps.customerPersona = closed('customerPersona');
  state.gaps.problemJtbd = closed('problemJtbd');
  return state;
}

function solutionDecision(): NextQuestionDecision {
  return {
    targetGap: 'solution',
    targetGapId: 'solution',
    issueId: 'problem_definition',
    questionText: SOLUTION_Q,
    whyNow: '무엇을 어떻게 해결하려는지 더 구체적으로 확인해야 합니다.',
    rationale: 'solution',
    score: 40_000,
    reframed: false,
    excludedGaps: [],
    drivenByReview: true,
    sourceAnswerId: 't7',
    sourceReviewId: 't7',
    reviewAction: 'advance',
    action: 'advance',
    actionRationale: '다음 주제',
    reason: 'advance after customerPersona=CLOSED; target=solution',
  };
}

function payerDecision(): NextQuestionDecision {
  return {
    ...solutionDecision(),
    targetGap: 'payer',
    targetGapId: 'payer',
    issueId: 'bm_design',
    questionText: PAYER_Q,
    whyNow: '누가 비용을 지불하는지 모르면 GO/HOLD를 결정할 수 없습니다. 지불자를 지금 확정합니다.',
    rationale: 'payer',
    reason: 'advance after customerPersona=CLOSED; target=payer',
  };
}

const living = { claims: [] } as unknown as LivingUnderstandingState;

describe('PR #197 T7 Stage A payer hold', () => {
  it('holds when customer+problem CLOSED and payer askable', () => {
    expect(shouldHoldOpenStageAPayer(gapStateCustomerProblemClosedPayerOpen())).toBe(true);
  });

  it('does not hold when payer is already CLOSED', () => {
    const state = gapStateCustomerProblemClosedPayerOpen();
    state.gaps.payer = closed('payer');
    expect(shouldHoldOpenStageAPayer(state)).toBe(false);
  });

  it('does not hold when problem is still OPEN', () => {
    const state = createEmptyGapState();
    state.gaps.customerPersona = closed('customerPersona');
    expect(shouldHoldOpenStageAPayer(state)).toBe(false);
  });

  it('binding remaps solution → payer while Stage A payer is OPEN', () => {
    const gapState = gapStateCustomerProblemClosedPayerOpen();
    const next = applyJudgmentNextQuestionBinding({
      decision: solutionDecision(),
      judgment: emptyCeoJudgmentState(0),
      gapState,
    });
    expect(next.targetGapId).toBe('payer');
    expect(next.questionText).toMatch(/지불|도입을 결정/);
    expect(next.reason).toMatch(/hold open Stage A payer/);
  });

  it('anti-repeat does not skip remapped T6 payer surface to solution', () => {
    const gapState = gapStateCustomerProblemClosedPayerOpen();
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'bm_design',
        answer: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        appliedAt: 't6',
        targetGap: 'validationTestability',
        askedQuestionText: PAYER_Q,
        intent: 'correction',
      },
    ];
    const next = applyAntiRepeatPolicy({
      decision: payerDecision(),
      turns,
      living,
      gapState,
      judgment: emptyCeoJudgmentState(0),
    });
    expect(next.targetGapId).toBe('payer');
    expect(next.targetGapId).not.toBe('solution');
    expect(next.questionText).toMatch(/지불|도입을 결정|결제/);
    expect(next.reason).toMatch(/hold open Stage A payer/);
  });
});
