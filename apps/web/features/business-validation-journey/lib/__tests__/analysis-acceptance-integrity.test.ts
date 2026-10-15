import { describe, expect, it } from 'vitest';

import {
  acceptAnalysisResults,
  countedExecutionIds,
  liveScreenStatus,
  separateStages,
} from '../analysis-acceptance';
import type { AnalysisPacket } from '../cross-review-contract';
import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { executionBadgeLabel } from '../present-execution';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T05:10:00.000Z';
const LATER = '2026-10-15T05:20:00.000Z';
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

function expectJudgmentBoundary(result: ReturnType<typeof acceptAnalysisResults>, beforeJudgments: typeof result.state.hypothesisJudgments) {
  expect(result.acceptance.judgmentChanged).toBe(false);
  expect(result.acceptance.verifiedFact).toBe(false);
  expect(result.acceptance.previousJudgmentText).toBe(result.acceptance.nextJudgmentText);
  expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
  expect(result.state.judgmentStatus).toBe('judgment_deferred');
  expect(result.state.researchStatus).toBe('research_not_run');
  expect(result.state.counterReviewStatus).toBe('counter_review_not_run');
  expect(result.state.hypothesisJudgments).toBe(beforeJudgments);
  expect(result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-payer')).toBeUndefined();
}

describe('analysis acceptance integrity', () => {
  it('keeps a Gemini-only arrival on the Gemini slot', () => {
    const { state, sourceId } = withSource();
    const result = acceptAnalysisResults(state, packet('gemini', sourceId), null, { now: NOW });

    expectJudgmentBoundary(result, state.hypothesisJudgments);
    expect(result.acceptance.disposition).toBe('recorded');
    expect(result.acceptance.gemini).toMatchObject({
      executionId: 'exec-gemini-1',
      providerId: 'openrouter',
      modelId: 'google/gemini-2.5-flash',
      analysisStatus: 'succeeded',
      capturedSourceId: sourceId,
      sourceCheck: 'matched',
      claimBearing: 'grounded',
      replayed: false,
    });
    expect(result.acceptance.gpt.analysisStatus).toBe('absent');
    expect(result.acceptance.causeIds).toContain('cause-support');
    expect(countedExecutionIds(result.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
  });

  it('keeps a GPT-only arrival on the GPT slot', () => {
    const { state, sourceId } = withSource();
    const result = acceptAnalysisResults(state, null, packet('gpt', sourceId), { now: NOW });

    expectJudgmentBoundary(result, state.hypothesisJudgments);
    expect(result.acceptance.gpt).toMatchObject({
      executionId: 'exec-gpt-1',
      providerId: 'openai',
      modelId: 'gpt-4o-mini',
      purpose: 'counter_review',
      sourceCheck: 'matched',
      claimBearing: 'grounded',
    });
    expect(result.acceptance.gemini.analysisStatus).toBe('absent');
    expect(countedExecutionIds(result.state.analysisAcceptances)).toEqual(['exec-gpt-1']);
  });

  it('appends the later provider without replacing the earlier execution', () => {
    const { state, sourceId } = withSource();
    const first = acceptAnalysisResults(state, packet('gemini', sourceId), null, { now: NOW });
    const second = acceptAnalysisResults(first.state, null, packet('gpt', sourceId), { now: LATER });

    expect(second.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(second.state.analysisAcceptances[0]?.gemini.executionId).toBe('exec-gemini-1');
    expect(second.state.analysisAcceptances[0]?.gemini.providerId).toBe('openrouter');
    expect(second.acceptance.gpt.executionId).toBe('exec-gpt-1');
    expect(second.acceptance.gpt.providerId).toBe('openai');
    expect(second.acceptance.gemini.analysisStatus).toBe('absent');
    expect(countedExecutionIds(second.state.analysisAcceptances)).toEqual(['exec-gemini-1', 'exec-gpt-1']);
    expect(second.state.sourceRecords[0]?.causeId).toBe('cause-support');
    expectJudgmentBoundary(second, state.hypothesisJudgments);
  });

  it('does not count a redelivered execution as another analysis', () => {
    const { state, sourceId } = withSource();
    const first = acceptAnalysisResults(state, packet('gemini', sourceId), packet('gpt', sourceId), { now: NOW });
    const beforeCount = countedExecutionIds(first.state.analysisAcceptances);
    const again = acceptAnalysisResults(
      first.state,
      packet('gemini', sourceId, { claim: '재전달에서 문장을 바꿨다.' }),
      packet('gpt', sourceId),
      { now: LATER },
    );

    expect(again.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(again.acceptance.disposition).toBe('duplicate_delivery');
    expect(again.acceptance.gemini.replayed).toBe(true);
    expect(again.acceptance.gpt.replayed).toBe(true);
    expect(again.acceptance.reason).toContain('새 분석으로 세지 않는다');
    expect(countedExecutionIds(again.state.analysisAcceptances)).toEqual(beforeCount);
    expect(separateStages(again.state).duplicateDeliveries).toHaveLength(1);
    expect(separateStages(again.state).recorded).toHaveLength(1);
    expect(again.state.analysisAcceptances[0]?.gemini.claim).toBe(PROBLEM_CLAIM);
    expectJudgmentBoundary(again, state.hypothesisJudgments);
  });

  it('keeps both executions when a new run conflicts with the recorded analysis', () => {
    const { state, sourceId } = withSource();
    const first = acceptAnalysisResults(state, packet('gemini', sourceId), null, { now: NOW });
    const second = acceptAnalysisResults(
      first.state,
      packet('gemini', sourceId, { executionId: 'exec-gemini-2', claim: DENY, support: DENY, citedExcerpt: DENY }),
      null,
      { now: LATER },
    );

    expect(second.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(second.acceptance.disposition).toBe('recorded');
    expect(second.acceptance.gemini.executionId).toBe('exec-gemini-2');
    expect(second.acceptance.gemini.providerId).toBe('openrouter');
    expect(second.acceptance.conflictsWithExecutionIds).toEqual(['exec-gemini-1']);
    expect(second.acceptance.reason).toContain('어느 쪽도 채택하지 않는다');
    expect(second.state.analysisAcceptances[0]?.gemini.claim).toBe(PROBLEM_CLAIM);
    expect(second.acceptance.gemini.claim).toBe(DENY);
    expect(countedExecutionIds(second.state.analysisAcceptances)).toEqual(['exec-gemini-1', 'exec-gemini-2']);
    expect(second.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expectJudgmentBoundary(second, state.hypothesisJudgments);
  });

  it('keeps the source transition separate when a later paste conflicts', () => {
    const { state, sourceId } = withSource();
    const accepted = acceptAnalysisResults(state, packet('gemini', sourceId), packet('gpt', sourceId), { now: NOW });
    const pasted = attachFounderSource(accepted.state, {
      text: DENY,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-deny',
      now: LATER,
    });
    const stages = separateStages(pasted.state);

    expect(pasted.state.analysisAcceptances[0]).toBe(accepted.acceptance);
    expect(accepted.acceptance.judgmentChanged).toBe(false);
    expect(accepted.acceptance.hypothesisEffects[0]).toMatchObject({
      hypothesisId: 'h-problem',
      beforeStance: 'supported',
      afterStance: 'supported',
      changed: false,
      causeId: 'cause-support',
    });
    expect(stages.hypothesisCauses[0]).toMatchObject({
      hypothesisId: 'h-problem',
      stance: 'held',
      causeId: 'cause-deny',
      verifiedFact: false,
    });
    expect(stages.hypothesisCauses[0]?.reason).toContain('cause-deny');
    expect(stages.sourceCauses.map((item) => item.causeId)).toEqual(['cause-support', 'cause-deny']);
    expect(stages.sourceCauses[0]?.text).toBe(SOURCE);
    expect(stages.businessJudgment).toBe('judgment_deferred');
    expect(stages.judgmentText).toBe(JUDGMENT_TEXT);
    expect(stages.researchStatus).toBe('research_not_run');
    expect(stages.counterReviewStatus).toBe('counter_review_not_run');
    expect(stages.countedExecutionIds).toEqual(['exec-gemini-1', 'exec-gpt-1']);
    expect(stages.verifiedFact).toBe(false);
  });

  it('preserves the prior execution when the new packet has no readable source', () => {
    const { state, sourceId } = withSource();
    const first = acceptAnalysisResults(state, packet('gemini', sourceId), null, { now: NOW });
    const missing = acceptAnalysisResults(first.state, null, packet('gpt', null, { claim: DENY }), { now: LATER });
    const locked = acceptAnalysisResults(
      first.state,
      null,
      packet('gpt', 'src-locked', { executionId: 'exec-gpt-locked', claim: DENY }),
      { now: LATER, sources: [{ id: 'src-locked', text: null }] },
    );

    expect(missing.state.analysisAcceptances[0]).toBe(first.acceptance);
    expect(missing.acceptance.gpt).toMatchObject({
      executionId: 'exec-gpt-1',
      providerId: 'openai',
      sourceCheck: 'uncheckable',
      claimBearing: 'unassessed',
    });
    expect(missing.acceptance.gpt.reason).toContain('원문 ID가 없다');
    expect(missing.acceptance.reason).toContain('반대 사실로 바꾸지 않는다');
    expect(missing.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expect(missing.state.hypothesisJudgments[0]?.causeId).toBe('cause-support');
    expect(locked.acceptance.gpt.sourceCheck).toBe('uncheckable');
    expect(locked.acceptance.gpt.claimBearing).toBe('unassessed');
    expect(locked.acceptance.gpt.reason).toContain('원문 내용에 접근할 수 없다');
    expect(countedExecutionIds(missing.state.analysisAcceptances)).toEqual(['exec-gemini-1', 'exec-gpt-1']);
    expectJudgmentBoundary(missing, state.hypothesisJudgments);
  });

  it('keeps a failed execution distinct from a not-run execution', () => {
    const { state, sourceId } = withSource();
    const mixed = acceptAnalysisResults(
      state,
      packet('gemini', sourceId, { status: 'failed' }),
      packet('gpt', sourceId, { status: 'not_run' }),
      { now: NOW },
    );
    const replay = acceptAnalysisResults(
      mixed.state,
      packet('gemini', sourceId, { status: 'failed', claim: '실패 뒤에 다른 문장' }),
      packet('gpt', sourceId, { status: 'not_run' }),
      { now: LATER },
    );

    expect(mixed.acceptance.comparison).toBe('not_compared');
    expect(mixed.acceptance.gemini.analysisStatus).toBe('failed');
    expect(mixed.acceptance.gemini.reason).toContain('분석이 실패했다');
    expect(mixed.acceptance.gpt.analysisStatus).toBe('not_run');
    expect(mixed.acceptance.gpt.reason).toContain('실행하지 않았다');
    expect(mixed.acceptance.gemini.sourceCheck).toBe('uncheckable');
    expect(mixed.acceptance.gpt.claimBearing).toBe('unassessed');
    expect(countedExecutionIds(mixed.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(replay.state.analysisAcceptances[0]).toBe(mixed.acceptance);
    expect(replay.acceptance.disposition).toBe('duplicate_delivery');
    expect(countedExecutionIds(replay.state.analysisAcceptances)).toEqual(['exec-gemini-1']);
    expect(replay.state.hypothesisJudgments[0]?.stance).toBe('supported');
    expectJudgmentBoundary(replay, state.hypothesisJudgments);
  });

  it('shows the live screen as not run and not compared', () => {
    const state = started();
    const screen = liveScreenStatus(state);

    expect(screen.acceptanceCount).toBe(0);
    expect(screen.analysisCompleted).toBe(false);
    expect(screen.comparison).toBe('not_compared');
    expect(screen.researchStatus).toBe('research_not_run');
    expect(screen.counterReviewStatus).toBe('counter_review_not_run');
    expect(screen.judgmentStatus).toBe('judgment_deferred');
    expect(executionBadgeLabel('research', screen.researchStatus)).toBe('조사 미실행');
    expect(executionBadgeLabel('counterReview', screen.counterReviewStatus)).toBe('반대 검토 미실행');
    expect(executionBadgeLabel('judgment', screen.judgmentStatus)).toBe('판단 유보');
  });
});
