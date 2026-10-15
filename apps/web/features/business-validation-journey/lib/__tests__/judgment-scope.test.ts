import { describe, expect, it, vi } from 'vitest';

import { gateCounterReview } from '@/features/agents/research/providers/openai-counter-review-provider';
import { getResearchProvider } from '@/features/agents/research/providers';

import { attachFounderSource } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE, type JourneyState } from '../journey-types';
import { verificationActionFor } from '../verification-action';

const NOW = '2026-10-15T03:32:00.000Z';
const SUPPORT = '물류본부 발주 담당자가 주문 화면과 배송 화면이 따로라 누락이 생긴다고 말했다';
const DENY = '물류본부 발주 담당자가 주문과 배송은 이미 한 화면이라 그 문제는 없다고 말했다';
const ASIDE = '오늘 날씨가 흐렸다';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function attach(state: JourneyState, text: string, hypothesisIds: string[], causeId: string) {
  return attachFounderSource(state, { text, hypothesisIds, causeId, now: NOW });
}

describe('evidence changes one hypothesis and leaves the business held', () => {
  it('keeps both judgments when the paste does not bear on the hypothesis', () => {
    const before = started();
    const result = attach(before, ASIDE, ['h-problem'], 'cause-aside');
    const record = result.state.sourceRecords[0];

    expect(record?.effect).toBe('unchanged');
    expect(record?.previousJudgmentText).toBe(JUDGMENT_TEXT);
    expect(record?.nextJudgmentText).toBe(JUDGMENT_TEXT);
    expect(record?.hypothesisBefore).toBe(record?.hypothesisAfter);
    expect(result.state.hypothesisJudgments).toEqual([]);
    expect(result.state.judgmentText).toBe(before.judgmentText);
    expect(record?.causeId).toBe('cause-aside');
    expect(record?.reason).toContain('바꿀 근거가 아니다');
  });

  it('revises only the problem hypothesis when the paste states the operational problem', () => {
    const before = started();
    const result = attach(before, SUPPORT, ['h-problem', 'h-payer'], 'cause-support');
    const problem = result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem');
    const record = result.state.sourceRecords[0];

    expect(record?.effect).toBe('revised');
    expect(record?.stance).toBe('supported');
    expect(record?.hypothesisBefore).not.toBe(record?.hypothesisAfter);
    expect(record?.hypothesisAfter).toContain('지지한다');
    expect(record?.previousJudgmentText).toBe(record?.nextJudgmentText);
    expect(problem?.causeId).toBe('cause-support');
    expect(problem?.sourceId).toBe(record?.id);
    expect(problem?.verifiedFact).toBe(false);
    expect(problem?.notEstablished).toEqual(['지불 의사', '구매', '반복 사용', '확장']);
    expect(result.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-payer')).toBeUndefined();
    expect(result.state.judgmentStatus).toBe('judgment_deferred');
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('revises the problem hypothesis when the paste contradicts it', () => {
    const result = attach(started(), DENY, ['h-problem'], 'cause-deny');
    const problem = result.state.hypothesisJudgments[0];

    expect(result.state.sourceRecords[0]?.effect).toBe('revised');
    expect(problem?.stance).toBe('contradicted');
    expect(problem?.before).not.toBe(problem?.after);
    expect(problem?.after).toContain('어긋난다');
    expect(problem?.notEstablished).toContain('구매');
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('holds the problem hypothesis when a later paste conflicts and asks for another observation', () => {
    const supported = attach(started(), SUPPORT, ['h-problem'], 'cause-support');
    const conflict = attach(supported.state, DENY, ['h-problem'], 'cause-deny');
    const problem = conflict.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem');
    const action = verificationActionFor(conflict.state);

    expect(conflict.state.sourceRecords).toHaveLength(2);
    expect(conflict.state.sourceRecords[1]?.effect).toBe('held');
    expect(problem?.stance).toBe('held');
    expect(problem?.before).toContain('지지한다');
    expect(problem?.after).toContain('충돌');
    expect(problem?.causeId).toBe('cause-deny');
    expect(conflict.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(action.action).toContain('충돌');
    expect(action.evidenceNeeded).toContain('업무 절차');
  });

  it('does not run the transition or move the judgment when the cause id is missing', () => {
    const before = started();
    const result = attach(before, SUPPORT, ['h-problem'], '');

    expect(result.transitionRan).toBe(false);
    expect(result.missing).toContain('원인 ID');
    expect(result.state).toBe(before);
    expect(result.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(result.state.hypothesisJudgments).toEqual([]);
  });

  it('does not treat the same hash as a second revision', () => {
    const first = attach(started(), SUPPORT, ['h-problem'], 'cause-support');
    const again = attach(first.state, SUPPORT, ['h-problem'], 'cause-support-2');

    expect(again.state.sourceRecords).toHaveLength(1);
    expect(again.state.hypothesisJudgments).toEqual(first.state.hypothesisJudgments);
    expect(again.reason).toContain('같은 원문 해시');
    expect(again.state.judgmentText).toBe(first.state.judgmentText);
  });

  it('keeps the gpt gate off the network and apart from gemini', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const gate = gateCounterReview(false);

    expect(getResearchProvider('openai').id).toBe('openai');
    expect(getResearchProvider('gemini').id).toBe('gemini');
    expect(getResearchProvider('openai')).not.toBe(getResearchProvider('gemini'));
    expect(gate.status).toBe('counter_review_not_run');
    expect(gate.networkCalled).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
