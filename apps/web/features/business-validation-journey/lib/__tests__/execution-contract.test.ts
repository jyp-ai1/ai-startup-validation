import { describe, expect, it, vi } from 'vitest';

import { countedExecutionIds } from '../analysis-acceptance';
import {
  admitExecutions,
  canonicalExecution,
  screenStateContract,
  type AnalysisExecutionRequest,
} from '../execution-contract';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T05:30:00.000Z';
const LATER = '2026-10-15T05:40:00.000Z';
const SOURCE = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const EXCERPT = '주문 화면과 배송 화면이 따로';
const DENY = '이미 한 화면이라 문제가 없다';
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

function request(
  side: 'gemini' | 'gpt',
  sourceId: string | null,
  patch: Partial<AnalysisExecutionRequest> = {},
): AnalysisExecutionRequest {
  const snapshot = {
    snapshotId: side === 'gemini' ? 'snap-gemini-1' : 'snap-gpt-1',
    answerIds: ['ans-1'],
    evidenceIds: [sourceId ?? 'evidence-missing'],
    hypothesisIds: ['h-problem'],
    causeIds: ['cause-support'],
  };
  return canonicalExecution(side, {
    executionId: side === 'gemini' ? 'exec-gemini-1' : 'exec-gpt-1',
    status: 'succeeded',
    inputSnapshot: snapshot,
    claim: PROBLEM_CLAIM,
    support: EXCERPT,
    counter: null,
    uncertainty: '지불 의사는 이 문장에 없다.',
    citedExcerpt: EXCERPT,
    capturedSourceId: sourceId,
    ...patch,
  });
}

describe('execution contract before a live model call', () => {
  it('stores the execution contract without calling the network or changing the judgment', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network must stay closed'));
    const { state, sourceId } = withSource();
    const result = admitExecutions(state, { now: NOW, gemini: request('gemini', sourceId), gpt: request('gpt', sourceId) });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    expect(result.acceptance.gemini).toMatchObject({
      executionId: 'exec-gemini-1',
      providerId: 'openrouter',
      modelId: 'google/gemini-2.5-flash',
      purpose: 'research',
      capturedSourceId: sourceId,
      sourceCheck: 'matched',
      claimBearing: 'grounded',
    });
    expect(result.acceptance.gemini.inputSnapshot).toMatchObject({
      snapshotId: 'snap-gemini-1',
      causeIds: ['cause-support'],
      hypothesisIds: ['h-problem'],
    });
    expect(result.acceptance.gpt.executionId).toBe('exec-gpt-1');
    expect(result.acceptance.verifiedFact).toBe(false);
    expect(result.acceptance.judgmentChanged).toBe(false);
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(result.state.researchStatus).toBe('research_not_run');
    expect(result.state.counterReviewStatus).toBe('counter_review_not_run');
    expect(result.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
  });

  it('keeps the first snapshot when the same execution is redelivered', () => {
    const { state, sourceId } = withSource();
    const first = admitExecutions(state, { now: NOW, gemini: request('gemini', sourceId) });
    const again = admitExecutions(first.state, {
      now: LATER,
      gemini: request('gemini', sourceId, {
        claim: '재전달에서 바꾼 주장',
        inputSnapshot: {
          snapshotId: 'snap-replaced',
          answerIds: ['ans-9'],
          evidenceIds: ['other'],
          hypothesisIds: ['h-payer'],
          causeIds: ['cause-other'],
        },
      }),
    });

    expect(again.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(again.acceptance.disposition).toBe('duplicate_delivery');
    expect(first.acceptance.gemini.claim).toBe(PROBLEM_CLAIM);
    expect(first.acceptance.gemini.inputSnapshot?.snapshotId).toBe('snap-gemini-1');
    expect(first.acceptance.gemini.hypothesisIds).toEqual(['h-problem']);
    expect(countedExecutionIds(again.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(again.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('preserves each provider when the arrival order changes', () => {
    const { state, sourceId } = withSource();
    const geminiFirst = admitExecutions(state, { now: NOW, gemini: request('gemini', sourceId) });
    const geminiThenGpt = admitExecutions(geminiFirst.state, { now: LATER, gpt: request('gpt', sourceId) });
    const gptFirst = admitExecutions(state, { now: NOW, gpt: request('gpt', sourceId) });
    const gptThenGemini = admitExecutions(gptFirst.state, { now: LATER, gemini: request('gemini', sourceId) });

    expect(geminiThenGpt.state.analysisAcceptances[0]).toBe(geminiFirst.acceptance);
    expect(countedExecutionIds(geminiThenGpt.state.analysisAcceptances)).toEqual(['exec-gemini-1', 'exec-gpt-1']);
    expect(gptThenGemini.state.analysisAcceptances[0]).toBe(gptFirst.acceptance);
    expect(countedExecutionIds(gptThenGemini.state.analysisAcceptances)).toEqual(['exec-gpt-1', 'exec-gemini-1']);
    expect(gptThenGemini.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('keeps a failed execution when a later retry uses a new execution id', () => {
    const { state, sourceId } = withSource();
    const failed = admitExecutions(state, {
      now: NOW,
      gemini: request('gemini', sourceId, { status: 'failed', claim: null }),
    });
    const sameId = admitExecutions(failed.state, {
      now: LATER,
      gemini: request('gemini', sourceId, { status: 'succeeded', claim: PROBLEM_CLAIM }),
    });
    const retried = admitExecutions(failed.state, {
      now: LATER,
      gemini: request('gemini', sourceId, { executionId: 'exec-gemini-2', status: 'succeeded' }),
    });

    expect(sameId.state.analysisAcceptances[0]).toBe(failed.acceptance);
    expect(sameId.acceptance.disposition).toBe('duplicate_delivery');
    expect(failed.acceptance.gemini.analysisStatus).toBe('failed');
    expect(failed.acceptance.gemini.claim).toBeNull();
    expect(countedExecutionIds(sameId.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(retried.state.analysisAcceptances[0]).toBe(failed.acceptance);
    expect(retried.acceptance.disposition).toBe('recorded');
    expect(retried.acceptance.gemini.executionId).toBe('exec-gemini-2');
    expect(retried.acceptance.gemini.analysisStatus).toBe('succeeded');
    expect(countedExecutionIds(retried.state.analysisAcceptances)).toEqual(['exec-gemini-1', 'exec-gemini-2']);
    expect(retried.state.judgmentStatus).toBe('judgment_deferred');
    expect(retried.state.hypothesisJudgments[0]?.stance).toBe('supported');
  });

  it('does not treat a missing body, a missing source, or agreement as a verified fact', () => {
    const { state, sourceId } = withSource();
    const missingBody = admitExecutions(state, {
      now: NOW,
      gemini: request('gemini', sourceId, { claim: '   ' }),
      gpt: request('gpt', sourceId, { status: 'not_run', claim: null }),
    });
    const missingSource = admitExecutions(state, {
      now: NOW,
      gemini: request('gemini', null),
      gpt: request('gpt', 'src-locked', { executionId: 'exec-gpt-locked' }),
    });
    const agreed = admitExecutions(state, {
      now: NOW,
      gemini: request('gemini', sourceId, { claim: '검증된 사실이다 VALIDATED' }),
      gpt: request('gpt', sourceId, { claim: '검증된 사실이다 VALIDATED' }),
    });

    expect(missingBody.acceptance.gemini.analysisStatus).toBe('result_missing');
    expect(missingBody.acceptance.gemini.reason).toContain('결과 본문이 없다');
    expect(missingBody.acceptance.gpt.analysisStatus).toBe('not_run');
    expect(missingBody.acceptance.comparison).toBe('not_compared');
    expect(missingSource.acceptance.gemini.sourceCheck).toBe('uncheckable');
    expect(missingSource.acceptance.gemini.claimBearing).toBe('unassessed');
    expect(agreed.acceptance.comparison).toBe('agreement');
    expect(agreed.acceptance.verifiedFact).toBe(false);
    expect(agreed.acceptance.judgmentChanged).toBe(false);
    expect(agreed.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(agreed.state.judgmentText).not.toContain('VALIDATED');
    expect(agreed.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(agreed.state.hypothesisJudgments[0]?.verifiedFact).toBe(false);
  });

  it('keeps both claims when a new execution conflicts and leaves the screen incomplete', () => {
    const fresh = started();
    const { state, sourceId } = withSource();
    const first = admitExecutions(state, { now: NOW, gemini: request('gemini', sourceId) });
    const conflict = admitExecutions(first.state, {
      now: LATER,
      gpt: request('gpt', sourceId, { claim: DENY, support: DENY, citedExcerpt: DENY }),
    });
    const screen = screenStateContract(fresh);

    expect(conflict.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(conflict.acceptance.conflictsWithExecutionIds).toEqual(['exec-gemini-1']);
    expect(conflict.acceptance.gemini.analysisStatus).toBe('absent');
    expect(first.acceptance.gemini.claim).toBe(PROBLEM_CLAIM);
    expect(conflict.acceptance.gpt.claim).toBe(DENY);
    expect(conflict.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(screen).toMatchObject({
      research: 'research_not_run',
      counterReview: 'counter_review_not_run',
      acceptance: 'acceptance_absent',
      citation: 'source_uncheckable',
      judgment: 'judgment_deferred',
      comparison: 'not_compared',
      analysisCompleted: false,
    });
    expect(screenStateContract(conflict.state).analysisCompleted).toBe(false);
    expect(screenStateContract(conflict.state).acceptance).toBe('acceptance_recorded');
    expect(screenStateContract(conflict.state).judgment).toBe('judgment_deferred');
  });
});
