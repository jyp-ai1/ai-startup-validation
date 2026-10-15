import { describe, expect, it } from 'vitest';

import { acceptanceSummary, acceptAnalysisResults } from '../analysis-acceptance';
import type { AnalysisPacket } from '../cross-review-contract';
import { attachFounderSource, sourceHash } from '../founder-source';
import { applyAnswer, correctField, startJourney } from '../journey-engine';
import { executionBadgeLabel } from '../present-execution';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T04:50:00.000Z';
const LATER = '2026-10-15T04:55:00.000Z';
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

function expectPreserved(
  result: ReturnType<typeof acceptAnalysisResults>,
  before: ReturnType<typeof withSource>['state'],
) {
  expect(result.acceptance.verifiedFact).toBe(false);
  expect(result.acceptance.judgmentChanged).toBe(false);
  expect(result.acceptance.previousJudgmentText).toBe(JUDGMENT_TEXT);
  expect(result.acceptance.nextJudgmentText).toBe(JUDGMENT_TEXT);
  expect(result.acceptance.judgmentStatus).toBe('judgment_deferred');
  expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
  expect(result.state.judgmentStatus).toBe('judgment_deferred');
  expect(result.state.hypothesisJudgments).toBe(before.hypothesisJudgments);
  expect(result.state.sourceRecords).toBe(before.sourceRecords);
  expect(result.state.sourceRecords.map((record) => record.text)).toEqual(before.sourceRecords.map((record) => record.text));
  expect(result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-payer')).toBeUndefined();
  expect(result.acceptance.hypothesisEffects.map((item) => item.hypothesisId)).not.toContain('h-payer');
  expect(result.acceptance.gemini.verifiedFact).toBe(false);
  expect(result.acceptance.gpt.verifiedFact).toBe(false);
}

describe('analysis acceptance', () => {
  it('links a matching problem analysis without verifying the hypothesis or the payer', () => {
    const { state, sourceId } = withSource();
    expect(sourceId).toBe(`paste-${sourceHash(SOURCE)}`);
    const result = acceptAnalysisResults(state, packet('gemini', sourceId), packet('gpt', sourceId), { now: NOW });

    expectPreserved(result, state);
    expect(result.acceptance.comparison).toBe('agreement');
    expect(result.acceptance.gemini).toMatchObject({
      executionId: 'exec-gemini-1',
      providerId: 'openrouter',
      modelId: 'google/gemini-2.5-flash',
      citedExcerpt: EXCERPT,
      capturedSourceId: sourceId,
      sourceCheck: 'matched',
      claimBearing: 'grounded',
      sourceConflict: 'none',
    });
    expect(result.acceptance.causeIds).toContain('cause-support');
    expect(result.acceptance.sourceIds).toEqual([sourceId]);
    expect(result.acceptance.hypothesisEffects).toEqual([
      expect.objectContaining({
        hypothesisId: 'h-problem',
        beforeStance: 'supported',
        afterStance: 'supported',
        changed: false,
        causeId: 'cause-support',
      }),
    ]);
    expect(result.acceptance.reason).toContain('바꾸지 않는다');
    expect(result.state.hypothesisJudgments[0]?.notEstablished).toEqual(
      expect.arrayContaining(['지불 의사', '구매', '반복 사용', '확장']),
    );
  });

  it('keeps a matching excerpt from grounding an unrelated payment claim', () => {
    const { state, sourceId } = withSource();
    const result = acceptAnalysisResults(
      state,
      packet('gemini', sourceId, { claim: '고객이 비용을 낸다.' }),
      packet('gpt', sourceId, { claim: '고객이 비용을 낸다.' }),
      { now: NOW },
    );

    expectPreserved(result, state);
    expect(result.acceptance.comparison).toBe('agreement');
    expect(result.acceptance.gemini.sourceCheck).toBe('matched');
    expect(result.acceptance.gemini.claimBearing).toBe('ungrounded');
    expect(result.acceptance.gemini.verifiedFact).toBe(false);
    expect(result.acceptance.hypothesisEffects.map((item) => item.hypothesisId)).toEqual(['h-problem']);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('does not treat a mismatch or a missing source as disproof', () => {
    const { state, sourceId } = withSource();
    const mismatch = acceptAnalysisResults(
      state,
      packet('gemini', sourceId, { citedExcerpt: '창고가 넓다', claim: DENY }),
      packet('gpt', sourceId, { citedExcerpt: '창고가 넓다', claim: DENY }),
      { now: NOW },
    );
    const missing = acceptAnalysisResults(state, packet('gemini', null, { claim: DENY }), packet('gpt', null, { claim: DENY }), {
      now: NOW,
    });

    expectPreserved(mismatch, state);
    expect(mismatch.acceptance.gemini.sourceCheck).toBe('mismatched');
    expect(mismatch.acceptance.gemini.claimBearing).toBe('unassessed');
    expect(mismatch.acceptance.gemini.sourceConflict).toBe('not_established');
    expect(mismatch.acceptance.reason).toContain('반대 사실로 바꾸지 않는다');
    expect(mismatch.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expectPreserved(missing, state);
    expect(missing.acceptance.gemini.sourceCheck).toBe('uncheckable');
    expect(missing.acceptance.gemini.claimBearing).toBe('unassessed');
    expect(missing.acceptance.gemini.reason).toContain('원문 ID가 없다');
  });

  it('stores agreement without promoting the shared claim to a verified fact', () => {
    const { state, sourceId } = withSource();
    const result = acceptAnalysisResults(state, packet('gemini', sourceId), packet('gpt', sourceId), { now: NOW });

    expect(result.acceptance.comparison).toBe('agreement');
    expect(result.acceptance.gemini.claim).toBe(PROBLEM_CLAIM);
    expect(result.acceptance.gpt.claim).toBe(PROBLEM_CLAIM);
    expect(result.acceptance.gemini.executionId).not.toBe(result.acceptance.gpt.executionId);
    expect(result.acceptance.verifiedFact).toBe(false);
    expect(result.trace.review.verifiedFact).toBe(false);
    expect(result.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('keeps both provider readings when Gemini and GPT conflict', () => {
    const { state } = withSource();
    const extraId = 'src-both';
    const withBoth = {
      ...state,
      sourceRecords: [
        ...state.sourceRecords,
        {
          ...state.sourceRecords[0],
          id: extraId,
          text: BOTH,
          excerpt: BOTH.slice(0, 240),
          causeId: 'cause-both',
        },
      ],
    };
    const result = acceptAnalysisResults(
      withBoth,
      packet('gemini', extraId),
      packet('gpt', extraId, { claim: DENY, support: DENY, citedExcerpt: DENY }),
      { now: NOW },
    );

    expect(result.acceptance.comparison).toBe('disagreement');
    expect(result.acceptance.gemini.claim).toBe(PROBLEM_CLAIM);
    expect(result.acceptance.gpt.claim).toBe(DENY);
    expect(result.acceptance.gemini.capturedSourceId).toBe(extraId);
    expect(result.acceptance.gpt.capturedSourceId).toBe(extraId);
    expect(result.acceptance.gemini.sourceCheck).toBe('matched');
    expect(result.acceptance.gpt.sourceCheck).toBe('matched');
    expect(result.acceptance.gemini.claimBearing).toBe('grounded');
    expect(result.acceptance.gpt.claimBearing).toBe('grounded');
    expect(result.state.sourceRecords).toHaveLength(2);
    expect(result.state.sourceRecords[0]?.text).toBe(SOURCE);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(result.acceptance.judgmentChanged).toBe(false);
    expect(result.acceptance.verifiedFact).toBe(false);
  });

  it('distinguishes a missing analysis from a failed one and keeps the other provider', () => {
    const { state, sourceId } = withSource();
    const failed = acceptAnalysisResults(state, packet('gemini', sourceId, { status: 'failed' }), packet('gpt', sourceId), {
      now: NOW,
    });
    const idle = acceptAnalysisResults(state, packet('gemini', sourceId, { status: 'not_run' }), null, { now: NOW });

    expect(failed.acceptance.comparison).toBe('not_compared');
    expect(failed.acceptance.gemini.analysisStatus).toBe('failed');
    expect(failed.acceptance.gemini.reason).toContain('분석이 실패했다');
    expect(failed.acceptance.gpt.analysisStatus).toBe('succeeded');
    expect(failed.acceptance.gpt.executionId).toBe('exec-gpt-1');
    expect(failed.acceptance.gemini.executionId).not.toBe(failed.acceptance.gpt.executionId);
    expect(failed.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(failed.state.sourceRecords).toHaveLength(1);
    expect(idle.acceptance.gemini.analysisStatus).toBe('not_run');
    expect(idle.acceptance.gemini.reason).toContain('실행하지 않았다');
    expect(idle.acceptance.gpt.analysisStatus).toBe('absent');
    expect(idle.acceptance.gpt.reason).toContain('분석 결과가 없다');
    expect(idle.acceptance.comparison).toBe('not_compared');
    expect(idle.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('preserves the earlier source when a new grounded reading conflicts with it', () => {
    const { state } = withSource();
    const extraId = 'src-both';
    const withBoth = {
      ...state,
      sourceRecords: [
        ...state.sourceRecords,
        {
          ...state.sourceRecords[0],
          id: extraId,
          text: BOTH,
          excerpt: BOTH.slice(0, 240),
          causeId: 'cause-both',
        },
      ],
    };
    const result = acceptAnalysisResults(
      withBoth,
      null,
      packet('gpt', extraId, { claim: DENY, support: DENY, citedExcerpt: DENY }),
      { now: NOW },
    );

    expect(result.acceptance.comparison).toBe('not_compared');
    expect(result.acceptance.gpt.sourceCheck).toBe('matched');
    expect(result.acceptance.gpt.claimBearing).toBe('grounded');
    expect(result.acceptance.gpt.sourceConflict).toBe('preserved');
    expect(result.acceptance.causeIds).toEqual(expect.arrayContaining(['cause-support', 'cause-both']));
    expect(result.acceptance.reason).toContain('원문을 지우지 않고');
    expect(result.acceptance.reason).toContain('exec-gpt-1');
    expect(result.acceptance.judgmentChanged).toBe(false);
    expect(result.state.sourceRecords.map((record) => record.id)).toEqual([state.sourceRecords[0]?.id, extraId]);
    expect(result.state.sourceRecords[0]?.text).toBe(SOURCE);
    expect(result.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(result.acceptance.hypothesisEffects[0]).toMatchObject({
      hypothesisId: 'h-problem',
      beforeStance: 'supported',
      afterStance: 'supported',
      changed: false,
      causeId: 'cause-support',
    });
  });

  it('does not overwrite one provider when a later result arrives', () => {
    const { state, sourceId } = withSource();
    const first = acceptAnalysisResults(state, packet('gemini', sourceId), null, { now: NOW });
    const second = acceptAnalysisResults(first.state, null, packet('gpt', sourceId), { now: LATER });

    expect(second.state.analysisAcceptances).toHaveLength(2);
    expect(second.state.analysisAcceptances[0]?.gemini.executionId).toBe('exec-gemini-1');
    expect(second.state.analysisAcceptances[0]?.gemini.providerId).toBe('openrouter');
    expect(second.state.analysisAcceptances[0]?.gpt.analysisStatus).toBe('absent');
    expect(second.state.analysisAcceptances[1]?.gpt.executionId).toBe('exec-gpt-1');
    expect(second.state.analysisAcceptances[1]?.gpt.providerId).toBe('openai');
    expect(second.state.analysisAcceptances[1]?.gemini.analysisStatus).toBe('absent');
    expect(second.state.hypothesisJudgments[0]?.causeId).toBe('cause-support');
    expect(second.state.researchStatus).toBe('research_not_run');
    expect(second.state.counterReviewStatus).toBe('counter_review_not_run');
  });

  it('keeps the acceptance record when a later answer rebuilds the journey', () => {
    const { state, sourceId } = withSource();
    const accepted = acceptAnalysisResults(state, packet('gemini', sourceId), packet('gpt', sourceId), { now: NOW });
    const question = accepted.state.nextQuestion;
    if (!question) throw new Error('question missing');
    const answered = applyAnswer(accepted.state, { choiceId: question.choices[0]?.id ?? '', freeText: '', now: LATER });
    const corrected = correctField(accepted.state, 'customer', '대기업 물류본부', LATER);

    expect(answered.applied).toBe(true);
    expect(answered.state.analysisAcceptances[0]?.gemini.executionId).toBe('exec-gemini-1');
    expect(answered.state.analysisAcceptances[0]?.gpt.executionId).toBe('exec-gpt-1');
    expect(answered.state.sourceRecords).toHaveLength(1);
    expect(answered.state.researchStatus).toBe('research_not_run');
    expect(corrected.state.analysisAcceptances[0]?.id).toBe(accepted.acceptance.id);
    expect(corrected.state.hypothesisJudgments[0]?.causeId).toBe('cause-support');
  });

  it('shows an empty acceptance line beside the not-run badges', () => {
    const state = started();

    expect(acceptanceSummary(state.analysisAcceptances)).toContain('분석 수용 기록 없음');
    expect(executionBadgeLabel('research', state.researchStatus)).toBe('조사 미실행');
    expect(executionBadgeLabel('counterReview', state.counterReviewStatus)).toBe('반대 검토 미실행');
    expect(executionBadgeLabel('judgment', state.judgmentStatus)).toBe('판단 유보');
  });
});
