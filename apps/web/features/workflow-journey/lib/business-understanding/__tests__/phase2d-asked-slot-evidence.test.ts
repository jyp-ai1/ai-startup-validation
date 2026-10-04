/**
 * Phase 2-D fix A — the asked gap closes or is contradicted only on direct evidence for its slot.
 */
import { describe, expect, it } from 'vitest';

import { applyGroundTruthAnswer, createInitialGroundTruthState } from '@/lib/ai-pm-validation-engine/ground-truth-engine';

import { buildAnswerReview } from '../build-answer-review';
import { isNoSlotContentAnswer } from '../asked-slot-evidence';
import { createEmptyGapState, updateGapStateFromReview } from '../update-gap-state-from-review';

type Issue = Parameters<typeof buildAnswerReview>[0]['askedIssueId'];

const ASK = {
  marketChannel: ['market_validation', '고객을 처음 만나는 채널은 어디인가요?'],
  problemJtbd: ['problem_definition', '이 고객이 겪는 가장 큰 문제는 무엇인가요?'],
  alternativesCompetitors: ['competitor_analysis', '비슷한 역할을 이미 하고 있는 서비스가 있나요?'],
  businessOneLiner: ['bm_design', '이 사업은 누구에게 무엇을 제공하나요?'],
  customerPersona: ['customer_definition', '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?'],
  payer: ['bm_design', '서비스 비용은 누가 지불하나요?'],
} as const satisfies Record<string, readonly [Issue, string]>;

function review(
  gap: keyof typeof ASK,
  answer: string,
  existingFactsByKey: Parameters<typeof buildAnswerReview>[0]['existingFactsByKey'] = {},
) {
  const [issue, q] = ASK[gap];
  return buildAnswerReview({
    turnId: 't-p2d-a',
    askedGapId: gap,
    askedIssueId: issue,
    userAnswer: answer,
    displayedQuestionText: q,
    askedQuestionText: q,
    existingFactsByKey,
  }).review;
}

describe('Phase 2-D A — no direct evidence keeps the asked gap unresolved', () => {
  it.each([
    ['marketChannel', '참고로 저희 팀은 3명이고 본사는 판교에 있습니다.'],
    ['businessOneLiner', '그 부분은 아직 대략적으로만 생각해 봤습니다.'],
    ['customerPersona', '고객은 여러 부류가 있어서 아직 하나로 좁히지는 못했습니다.'],
    ['problemJtbd', '불편한 점이 몇 가지 있는데 아직 하나로 정리하지는 못했습니다.'],
    ['payer', '결제는 고객 쪽에서 하게 될 텐데 누가 할지는 아직 정하지 못했습니다.'],
  ] as const)('%s is not CLOSED or CONTRADICTED by "%s"', (gap, answer) => {
    const r = review(gap, answer, { market: '인스타그램 광고', customer: '바쁜 직장인' });
    expect(['CLOSED', 'CONTRADICTED']).not.toContain(r.gapVerdicts[gap]?.completeness);
    expect(r.contradictions).toEqual([]);
    expect(r.extractedFacts).toEqual([]);
  });

  it('an answer that declares other slots only does not close the asked gap', () => {
    const r = review(
      'alternativesCompetitors',
      '핵심 고객은 공공기관 실무자이고, 가장 큰 문제는 레거시 연동입니다.',
    );
    expect(r.gapVerdicts.alternativesCompetitors?.completeness).not.toBe('CLOSED');
  });

  it('a new customer stated under the problem ask contradicts the customer, not closes the problem', () => {
    const r = review('problemJtbd', '사실 핵심 고객은 지역 세무사 사무실입니다.', {
      customer: '바쁜 직장인',
    });
    expect(r.gapVerdicts.problemJtbd?.completeness).not.toBe('CLOSED');
    expect(r.gapVerdicts.customerPersona?.completeness).toBe('CONTRADICTED');
  });

  it('a CLOSED gap stays CLOSED after a no-evidence answer on it', () => {
    const first = review('marketChannel', '고객은 주로 인스타그램 광고로 처음 만납니다.');
    let state = updateGapStateFromReview(first, createEmptyGapState());
    expect(state.gaps.marketChannel?.completeness).toBe('CLOSED');
    state = updateGapStateFromReview(
      review('marketChannel', '참고로 저희 팀은 3명이고 본사는 판교에 있습니다.', {
        market: '고객은 주로 인스타그램 광고로 처음 만납니다.',
      }),
      state,
    );
    expect(state.gaps.marketChannel?.completeness).toBe('CLOSED');
  });
});

describe('Phase 2-D A — direct answers still close the asked gap', () => {
  it.each([
    ['marketChannel', '고객은 주로 인스타그램 광고로 처음 만납니다.'],
    ['marketChannel', '인스타그램 광고와 맘카페 입소문입니다.'],
    ['businessOneLiner', '저희 사업은 개인 일정·할 일 통합 앱입니다.'],
    ['customerPersona', '핵심 고객은 바쁜 직장인입니다.'],
    ['problemJtbd', '고객이 겪는 가장 큰 문제는 할 일·일정 분산입니다.'],
    ['payer', '비용은 의뢰하는 기업이 결제합니다.'],
  ] as const)('%s closes on "%s"', (gap, answer) => {
    expect(review(gap, answer).gapVerdicts[gap]?.completeness).toBe('CLOSED');
  });

  it('a hedged-but-contentful answer is not treated as content-free', () => {
    expect(isNoSlotContentAnswer('아마 바쁜 직장인일 것 같은데, 아직 확인해 보지는 않았습니다.')).toBe(false);
    expect(isNoSlotContentAnswer('서울에서 일하는 3년 차 직장인입니다.')).toBe(false);
  });
});

describe('Phase 2-D A — official GT keeps the asked slot open without evidence', () => {
  it('does not close marketChannel on a customer correction', () => {
    const state = applyGroundTruthAnswer({
      state: createInitialGroundTruthState(),
      behavior: 'normal',
      turn: 2,
      userAnswer: '정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.',
      askedGapId: 'marketChannel',
    });
    expect(state.gaps.marketChannel).not.toBe('CLOSED');
  });

  it('does not close marketChannel on team size and HQ', () => {
    const state = applyGroundTruthAnswer({
      state: createInitialGroundTruthState(),
      behavior: 'normal',
      turn: 2,
      userAnswer: '참고로 우리 팀은 8명이며, 본사는 판교에 있습니다.',
      askedGapId: 'marketChannel',
    });
    expect(state.gaps.marketChannel).not.toBe('CLOSED');
  });

  it('still closes marketChannel on a direct channel answer', () => {
    const state = applyGroundTruthAnswer({
      state: createInitialGroundTruthState(),
      behavior: 'normal',
      turn: 2,
      userAnswer: '고객은 주로 인스타그램 광고로 처음 만납니다.',
      askedGapId: 'marketChannel',
    });
    expect(state.gaps.marketChannel).toBe('CLOSED');
  });
});
