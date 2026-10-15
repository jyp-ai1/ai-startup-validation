import { describe, expect, it } from 'vitest';

import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { executionBadgeLabel } from '../present-execution';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';
import {
  applyCrossReview,
  assessCrossReview,
  liveCrossReview,
  type AnalysisPacket,
} from '../cross-review-contract';

const NOW = '2026-10-15T04:20:00.000Z';
const SUPPORT = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function packet(side: 'gemini' | 'gpt', patch: Partial<AnalysisPacket> = {}): AnalysisPacket {
  const gemini = side === 'gemini';
  return {
    executionId: gemini ? 'exec-gemini-1' : 'exec-gpt-1',
    providerId: gemini ? 'openrouter' : 'openai',
    modelId: gemini ? 'google/gemini-2.5-flash' : 'gpt-4o-mini',
    endpoint: gemini
      ? 'https://openrouter.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions',
    purpose: gemini ? 'research' : 'counter_review',
    status: 'succeeded',
    answerIds: ['ans-1'],
    evidenceIds: ['paste-1'],
    claim: '문제 가설은 발주와 배송이 나뉜다는 원문과 맞는다.',
    support: '주문 화면과 배송 화면이 따로라는 문장',
    counter: null,
    uncertainty: '지불 의사는 이 문장에 없다.',
    hypothesisIds: ['h-problem'],
    citedExcerpt: '주문 화면과 배송 화면이 따로',
    capturedSourceId: null,
    ...patch,
  };
}

describe('cross review contract', () => {
  it('stays not compared when only Gemini has a result', () => {
    const review = assessCrossReview(packet('gemini'), packet('gpt', { status: 'not_run', claim: null }));

    expect(review.outcome).toBe('not_compared');
    expect(review.verifiedFact).toBe(false);
    expect(review.businessJudgment).toBe('preserved');
  });

  it('stays not compared when only GPT has a result', () => {
    const review = assessCrossReview(packet('gemini', { status: 'not_run', claim: null }), packet('gpt'));

    expect(review.outcome).toBe('not_compared');
    expect(review.preservedClaims).toEqual([]);
  });

  it('does not verify a hypothesis when the two claims match', () => {
    const state = attachFounderSource(started(), {
      text: SUPPORT,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-support',
      now: NOW,
    }).state;
    const before = state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem');
    const result = applyCrossReview(state, packet('gemini'), packet('gpt'));
    const after = result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem');

    expect(result.review.outcome).toBe('agreement');
    expect(result.review.verifiedFact).toBe(false);
    expect(result.review.reason).toContain('사실로 올리지 않는다');
    expect(after).toBe(before);
    expect(after?.stance).toBe('supported');
    expect(after?.verifiedFact).toBe(false);
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(result.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('keeps both claims when the readings conflict and does not pick a side', () => {
    const state = attachFounderSource(started(), {
      text: SUPPORT,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-support',
      now: NOW,
    }).state;
    const result = applyCrossReview(
      state,
      packet('gemini'),
      packet('gpt', { claim: '문제 가설은 그 원문과 어긋난다.', support: '이미 한 화면이라는 다른 메모' }),
    );

    expect(result.review.outcome).toBe('disagreement');
    expect(result.review.preservedClaims.map((item) => item.side)).toEqual(['gemini', 'gpt']);
    expect(result.review.preservedClaims.map((item) => item.claim)).toEqual([
      '문제 가설은 발주와 배송이 나뉜다는 원문과 맞는다.',
      '문제 가설은 그 원문과 어긋난다.',
    ]);
    expect(result.review.nextEvidence).toContain('한쪽을 고르지 않는다');
    expect(result.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('keeps the previous judgment and source history when analysis fails', () => {
    const state = attachFounderSource(started(), {
      text: SUPPORT,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-support',
      now: NOW,
    }).state;
    const result = applyCrossReview(state, packet('gemini', { status: 'failed', claim: null }), packet('gpt'));

    expect(result.review.outcome).toBe('not_compared');
    expect(result.state).toBe(state);
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(result.state.sourceRecords).toHaveLength(1);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('does not move an unrelated hypothesis', () => {
    const state = attachFounderSource(started(), {
      text: SUPPORT,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-support',
      now: NOW,
    }).state;
    const result = applyCrossReview(
      state,
      packet('gemini', { hypothesisIds: ['h-problem'] }),
      packet('gpt', { hypothesisIds: ['h-problem'] }),
    );

    expect(result.review.affectedHypothesisIds).toEqual(['h-problem']);
    expect(result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-payer')).toBeUndefined();
    expect(result.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
  });

  it('matches the live screen badges to not-run execution', () => {
    const state = started();
    const review = liveCrossReview();

    expect(review.outcome).toBe('not_compared');
    expect(state.researchStatus).toBe('research_not_run');
    expect(state.counterReviewStatus).toBe('counter_review_not_run');
    expect(state.judgmentStatus).toBe('judgment_deferred');
    expect(executionBadgeLabel('research', state.researchStatus)).toBe('조사 미실행');
    expect(executionBadgeLabel('counterReview', state.counterReviewStatus)).toBe('반대 검토 미실행');
    expect(executionBadgeLabel('judgment', state.judgmentStatus)).toBe('판단 유보');
  });
});
