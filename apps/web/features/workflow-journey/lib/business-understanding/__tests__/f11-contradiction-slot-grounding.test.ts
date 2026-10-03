import { describe, expect, it } from 'vitest';

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { replayCalibrationTurn } from '@/lib/ai-pm-validation-engine/calibration-turn-replay';
import { MINI_SANDBOX_BUSINESSES } from '@/lib/ai-pm-validation-engine/mini-sandbox-businesses';

import { buildAnswerReview } from '../build-answer-review';
import { updateGapStateFromReview } from '../update-gap-state-from-review';

const PRIOR_CUSTOMER = '직장인·프리랜서 중심이고, SMB도 포함합니다.';
const REVERSAL = '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.';

function review(input: {
  askedGapId: string;
  askedIssueId: Parameters<typeof buildAnswerReview>[0]['askedIssueId'];
  userAnswer: string;
  question: string;
  existingCustomer?: string;
}): AnswerReview {
  return buildAnswerReview({
    turnId: `t-${input.askedGapId}`,
    userAnswer: input.userAnswer,
    askedGapId: input.askedGapId,
    askedIssueId: input.askedIssueId,
    displayedQuestionText: input.question,
    askedQuestionText: input.question,
    existingFactsByKey: input.existingCustomer ? { customer: input.existingCustomer } : {},
  }).review;
}

function stateWith(gapId: string, completeness: 'CONTRADICTED' | 'CLOSED'): GapKnowledgeState {
  return {
    version: 1,
    gaps: {
      [gapId]: {
        gapId,
        completeness,
        sourceTurnId: 'prior',
        sourceReviewId: 'prior',
        evidence: [],
        confidence: 'medium',
        lastUpdated: '2026-01-01T00:00:00.000Z',
        rationale: 'prior',
      },
    },
    lastReviewByGap: {},
  };
}

describe('F11 — contradiction is grounded to its own slot', () => {
  it('customer reversal on a competitor ask contradicts customerPersona only', () => {
    const r = review({
      askedGapId: 'alternativesCompetitors',
      askedIssueId: 'competitor_analysis',
      userAnswer: REVERSAL,
      question: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
      existingCustomer: PRIOR_CUSTOMER,
    });
    expect(r.contradictions[0]?.gapId).toBe('customerPersona');
    expect(r.gapVerdicts.customerPersona?.completeness).toBe('CONTRADICTED');
    expect(r.gapVerdicts.alternativesCompetitors?.completeness).toBe('OPEN');
  });

  it('customer reversal on a customer ask still contradicts customerPersona', () => {
    const r = review({
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      userAnswer: REVERSAL,
      question: '주요 고객은 누구인가요?',
      existingCustomer: PRIOR_CUSTOMER,
    });
    expect(r.gapVerdicts.customerPersona?.completeness).toBe('CONTRADICTED');
  });
});

describe('F11 — CONTRADICTED only moves on same-slot evidence', () => {
  it('an answer about another slot cannot close a CONTRADICTED gap', () => {
    const r = review({
      askedGapId: 'alternativesCompetitors',
      askedIssueId: 'competitor_analysis',
      userAnswer: '고객은 50대 남성 기업 IT 담당자입니다.',
      question: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
    });
    expect(r.extractedFacts.some((f) => f.targetGap === 'alternativesCompetitors')).toBe(false);
    const next = updateGapStateFromReview(r, stateWith('alternativesCompetitors', 'CONTRADICTED'));
    expect(next.gaps.alternativesCompetitors?.completeness).toBe('CONTRADICTED');
  });

  it('a bare A/B reply without the value keeps the conflict open', () => {
    const r = review({
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      userAnswer: 'B요',
      question: '「고객」에 두 가지 답이 있습니다. A) … · B) … 어느 쪽이 맞나요?',
    });
    const next = updateGapStateFromReview(r, stateWith('customerPersona', 'CONTRADICTED'));
    expect(next.gaps.customerPersona?.completeness).toBe('CONTRADICTED');
  });

  it('an explicit correction with the customer value resolves the conflict', () => {
    const r = review({
      askedGapId: 'customerPersona',
      askedIssueId: 'customer_definition',
      userAnswer: '정정합니다. 고객은 50대 남성 기업 IT 담당자가 맞습니다.',
      question: '「고객」에 두 가지 답이 있습니다. A) … · B) … 어느 쪽이 맞나요?',
    });
    expect(r.extractedFacts.some((f) => f.targetGap === 'customerPersona')).toBe(true);
    const next = updateGapStateFromReview(r, stateWith('customerPersona', 'CONTRADICTED'));
    expect(next.gaps.customerPersona?.completeness).not.toBe('CONTRADICTED');
    expect(next.gaps.customerPersona?.evidence.length).toBeGreaterThan(0);
  });

  it('CLOSED stays monotonic', () => {
    const r = review({
      askedGapId: 'alternativesCompetitors',
      askedIssueId: 'competitor_analysis',
      userAnswer: '잘 모르겠어요',
      question: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
    });
    const next = updateGapStateFromReview(r, stateWith('alternativesCompetitors', 'CLOSED'));
    expect(next.gaps.alternativesCompetitors?.completeness).toBe('CLOSED');
  });
});

const FACT_GAP: Record<string, string> = {
  buyer: 'payer',
  customer: 'customerPersona',
  problem: 'problemJtbd',
  business: 'businessOneLiner',
  revenue: 'revenueModel',
  market: 'marketChannel',
  competitor: 'alternativesCompetitors',
  differentiation: 'differentiationVsAlternatives',
  diffRelevance: 'differentiationVsAlternatives',
};

describe('F11 — longitudinal replay (Sprint 2 pack, all sandbox businesses)', () => {
  for (const biz of MINI_SANDBOX_BUSINESSES) {
    it(`${biz.id}: no CONTRADICTED gap closes without same-slot facts; asked gap not contradicted by another slot`, () => {
      let prevGaps: Record<string, string> = {};
      for (let turn = 1; turn <= 7; turn++) {
        const replay = replayCalibrationTurn({ businessId: biz.id, behavior: 'longitudinal_f11', turn });
        expect(replay).not.toBeNull();
        const gaps = replay!.actualGaps;
        const factGaps = new Set(replay!.actualFacts.map((f) => FACT_GAP[f.key]).filter(Boolean));

        for (const [gapId, prev] of Object.entries(prevGaps)) {
          if (prev === 'CONTRADICTED' && gaps[gapId] === 'CLOSED') {
            expect(factGaps.has(gapId), `${biz.id} t${turn} ${gapId}`).toBe(true);
          }
        }
        if (turn === 5) {
          expect(gaps.customerPersona).toBe('CONTRADICTED');
          if (replay!.askedGapId !== 'customerPersona') {
            expect(gaps[replay!.askedGapId]).not.toBe('CONTRADICTED');
          }
        }
        prevGaps = gaps;
      }
    });
  }
});
