import { describe, expect, it } from 'vitest';

import {
  applyCitationTrace,
  liveCitationTrace,
  sourceCheckLabel,
  storedSourcesFromJourney,
  type StoredSource,
} from '../citation-reconciliation';
import type { AnalysisPacket } from '../cross-review-contract';
import { attachFounderSource, sourceHash } from '../founder-source';
import { startJourney } from '../journey-engine';
import { executionBadgeLabel } from '../present-execution';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T04:40:00.000Z';
const SOURCE = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const EXCERPT = '주문 화면과 배송 화면이 따로';
const DENY = '이미 한 화면이라 문제가 없다';
const BOTH = `${SOURCE} 다른 메모에는 ${DENY}.`;
const PROBLEM_CLAIM = '문제 가설은 발주와 배송이 나뉜다는 원문과 맞는다.';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function withSource() {
  const result = attachFounderSource(started(), {
    text: SOURCE,
    hypothesisIds: ['h-problem'],
    causeId: 'cause-support',
    now: NOW,
  });
  const record = result.state.sourceRecords[0];
  if (!record) throw new Error('source missing');
  return { state: result.state, sourceId: record.id };
}

function packet(side: 'gemini' | 'gpt', sourceId: string | null, patch: Partial<AnalysisPacket> = {}): AnalysisPacket {
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
    claim: PROBLEM_CLAIM,
    support: EXCERPT,
    counter: null,
    uncertainty: '지불 의사는 이 문장에 없다.',
    hypothesisIds: ['h-problem'],
    citedExcerpt: EXCERPT,
    capturedSourceId: sourceId,
    ...patch,
  };
}

function expectBoundary(
  result: ReturnType<typeof applyCitationTrace>,
  outcome: string,
  before: ReturnType<typeof withSource>['state'],
) {
  expect(result.trace.review.outcome).toBe(outcome);
  expect(result.trace.review.verifiedFact).toBe(false);
  expect(result.trace.verifiedFact).toBe(false);
  expect(result.trace.businessJudgment).toBe('preserved');
  expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
  expect(result.state.judgmentStatus).toBe('judgment_deferred');
  expect(result.state.hypothesisJudgments).toBe(before.hypothesisJudgments);
  expect(result.state.sourceRecords).toBe(before.sourceRecords);
  expect(result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-payer')).toBeUndefined();
  expect(result.trace.review.affectedHypothesisIds).not.toContain('h-payer');
}

describe('citation reconciliation', () => {
  it('matches an excerpt that is in the stored source and still does not verify the claim', () => {
    const { state, sourceId } = withSource();
    expect(sourceId).toBe(`paste-${sourceHash(SOURCE)}`);
    const result = applyCitationTrace(
      state,
      packet('gemini', sourceId, { citedExcerpt: '주문  화면과   배송 화면이 따로' }),
      packet('gpt', sourceId),
    );

    expectBoundary(result, 'agreement', state);
    expect(result.trace.citations.map((item) => item.sourceCheck)).toEqual(['matched', 'matched']);
    expect(result.trace.citations.map((item) => item.claimBearing)).toEqual(['grounded', 'grounded']);
    expect(result.trace.citations.every((item) => item.verifiedFact === false)).toBe(true);
    expect(result.trace.review.affectedHypothesisIds).toEqual(['h-problem']);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(result.trace.reason).toContain('사실 검증');
  });

  it('does not confirm a source when the excerpt is absent and does not invert the claim', () => {
    const { state, sourceId } = withSource();
    const result = applyCitationTrace(
      state,
      packet('gemini', sourceId, { citedExcerpt: '창고가 넓다' }),
      packet('gpt', sourceId, { citedExcerpt: '창고가 넓다' }),
    );

    expectBoundary(result, 'agreement', state);
    expect(result.trace.citations.map((item) => item.sourceCheck)).toEqual(['mismatched', 'mismatched']);
    expect(result.trace.citations.map((item) => item.claimBearing)).toEqual(['unassessed', 'unassessed']);
    expect(result.trace.citations[0]?.reason).toContain('반대 사실로 바꾸지 않는다');
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('leaves the check uncheckable when the packet has no source id', () => {
    const { state } = withSource();
    const result = applyCitationTrace(state, packet('gemini', null), packet('gpt', null));

    expectBoundary(result, 'agreement', state);
    expect(result.trace.citations.map((item) => item.sourceCheck)).toEqual(['uncheckable', 'uncheckable']);
    expect(result.trace.citations.map((item) => item.claimBearing)).toEqual(['unassessed', 'unassessed']);
    expect(result.trace.citations[0]?.reason).toContain('원문 ID가 없다');
    expect(result.trace.citations[0]?.citedExcerpt).toBe(EXCERPT);
  });

  it('stays uncheckable when the source id cannot be read', () => {
    const { state } = withSource();
    const missing = applyCitationTrace(state, packet('gemini', 'src-missing'), packet('gpt', 'src-missing'), []);
    const locked: StoredSource[] = [{ id: 'src-locked', text: null }];
    const inaccessible = applyCitationTrace(
      state,
      packet('gemini', 'src-locked'),
      packet('gpt', 'src-locked'),
      locked,
    );

    expectBoundary(missing, 'agreement', state);
    expect(missing.trace.citations[0]?.reason).toContain('저장된 원문을 찾지 못했다');
    expect(missing.trace.citations.map((item) => item.claimBearing)).toEqual(['unassessed', 'unassessed']);
    expectBoundary(inaccessible, 'agreement', state);
    expect(inaccessible.trace.citations[0]?.reason).toContain('원문 내용에 접근할 수 없다');
    expect(inaccessible.trace.citations.map((item) => item.sourceCheck)).toEqual(['uncheckable', 'uncheckable']);
  });

  it('keeps a matching excerpt from grounding a claim the excerpt does not carry', () => {
    const { state, sourceId } = withSource();
    const result = applyCitationTrace(
      state,
      packet('gemini', sourceId, { claim: '고객이 비용을 낸다.', hypothesisIds: ['h-problem'] }),
      packet('gpt', sourceId, { claim: '고객이 비용을 낸다.', hypothesisIds: ['h-problem'] }),
    );

    expectBoundary(result, 'agreement', state);
    expect(result.trace.citations.map((item) => item.sourceCheck)).toEqual(['matched', 'matched']);
    expect(result.trace.citations.map((item) => item.claimBearing)).toEqual(['ungrounded', 'ungrounded']);
    expect(result.trace.citations[0]?.hypothesisIds).toEqual(['h-problem']);
    expect(result.trace.review.verifiedFact).toBe(false);
    expect(result.state.hypothesisJudgments[0]?.notEstablished).toContain('지불 의사');
  });

  it('preserves both readings when Gemini and GPT cite the same source differently', () => {
    const { state } = withSource();
    const sources = [...storedSourcesFromJourney(state), { id: 'src-both', text: BOTH }];
    const result = applyCitationTrace(
      state,
      packet('gemini', 'src-both'),
      packet('gpt', 'src-both', {
        claim: DENY,
        support: DENY,
        citedExcerpt: DENY,
      }),
      sources,
    );

    expectBoundary(result, 'disagreement', state);
    expect(result.trace.citations.map((item) => item.sourceCheck)).toEqual(['matched', 'matched']);
    expect(result.trace.citations.map((item) => item.claimBearing)).toEqual(['grounded', 'grounded']);
    expect(result.trace.citations.map((item) => item.capturedSourceId)).toEqual(['src-both', 'src-both']);
    expect(result.trace.review.preservedClaims.map((item) => item.claim)).toEqual([PROBLEM_CLAIM, DENY]);
    expect(result.trace.review.preservedClaims.map((item) => item.citedExcerpt)).toEqual([EXCERPT, DENY]);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(result.trace.review.nextEvidence).toContain('한쪽을 고르지 않는다');
  });

  it('keeps the prior judgment when one analysis fails or never runs', () => {
    const { state, sourceId } = withSource();
    const failed = applyCitationTrace(
      state,
      packet('gemini', sourceId, { status: 'failed' }),
      packet('gpt', sourceId),
    );
    const idle = applyCitationTrace(
      state,
      packet('gemini', sourceId, { status: 'not_run' }),
      packet('gpt', sourceId),
    );

    expect(failed.trace.review.outcome).toBe('not_compared');
    expect(failed.state).toBe(state);
    expect(failed.trace.citations[0]).toMatchObject({
      sourceCheck: 'uncheckable',
      claimBearing: 'unassessed',
      analysisStatus: 'failed',
    });
    expect(failed.trace.citations[1]?.sourceCheck).toBe('matched');
    expect(failed.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(failed.state.sourceRecords).toHaveLength(1);
    expect(idle.trace.review.outcome).toBe('not_compared');
    expect(idle.state).toBe(state);
    expect(idle.trace.citations[0]?.analysisStatus).toBe('not_run');
    expect(idle.trace.citations[0]?.sourceCheck).toBe('uncheckable');
    expect(idle.trace.citations[0]?.claimBearing).toBe('unassessed');
  });

  it('shows uncheckable citation status beside the not-run badges', () => {
    const state = started();
    const trace = liveCitationTrace();

    expect(trace.review.outcome).toBe('not_compared');
    expect(trace.citations.map((item) => item.sourceCheck)).toEqual(['uncheckable', 'uncheckable']);
    expect(trace.citations.map((item) => sourceCheckLabel(item.sourceCheck))).toEqual(['대조 불가', '대조 불가']);
    expect(trace.reason).toContain('대조 완료로 보지 않는다');
    expect(executionBadgeLabel('research', state.researchStatus)).toBe('조사 미실행');
    expect(executionBadgeLabel('counterReview', state.counterReviewStatus)).toBe('반대 검토 미실행');
    expect(executionBadgeLabel('judgment', state.judgmentStatus)).toBe('판단 유보');
  });
});
