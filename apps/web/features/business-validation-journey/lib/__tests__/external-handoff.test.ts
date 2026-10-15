import { describe, expect, it } from 'vitest';

import { acceptPastedAnalysis, nextHandoffInput, prepareAnalysisRequest } from '../external-handoff';
import { applyAnswer, correctField, startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, type Intake } from '../journey-types';

const NOW = '2026-10-15T07:10:00.000Z';
const LATER = '2026-10-15T07:20:00.000Z';
const PASTE = '주문 화면과 배송 화면이 나뉘어 누락이 생긴다는 주장이 있다. 지불 증거는 이 문장에 없다.';
const ANSWER = '지난주 발주서 12건 중 2건이 배송 화면에 없었다.';

const INTAKE: Intake = {
  business: '기업 물류본부의 주문과 배송 누락을 줄이는 서비스',
  customer: '기업 물류본부',
  problem: '주문 정보와 배송 정보가 분리되어 누락이 발생한다',
  solution: '주문과 배송을 한 화면에서 대조한다',
  payer: '',
  revenue: '',
  evidence: '',
  url: '',
};

function started() {
  const result = startJourney(INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

describe('external handoff', () => {
  it('keeps a pasted reference and the later answer without calling a model', () => {
    const state = started();
    const prepared = prepareAnalysisRequest(state, NOW);
    expect(prepared.liveModelCall).toBe(false);
    expect(prepared.prompt).toContain('기업 물류본부');
    expect(prepared.prompt).toContain('주문 정보와 배송 정보');
    expect(prepared.prompt).toContain('ALABOM이 이 문장을 모델 API나 AI 웹 화면에 보내지 않는다');

    const failed = acceptPastedAnalysis(state, {
      executionId: prepared.executionId,
      text: '',
      providerLabel: 'user',
      now: NOW,
      failed: true,
    });
    expect(failed.accepted).toBe(false);
    expect(failed.state).toBe(state);
    expect(failed.state.judgmentText).toBe(JUDGMENT_TEXT);

    const kept = acceptPastedAnalysis(state, {
      executionId: prepared.executionId,
      text: PASTE,
      providerLabel: 'user_declared_chatgpt',
      citedExcerpt: '주문 화면과 배송 화면이 나뉘어',
      now: NOW,
    });
    expect(kept.accepted).toBe(true);
    expect(kept.state.judgmentText).toBe(state.judgmentText);
    expect(kept.state.hypothesisJudgments).toBe(state.hypothesisJudgments);
    expect(kept.state.externalNotes?.[0]).toMatchObject({
      executionId: prepared.executionId,
      verifiedFact: false,
      judgmentChanged: false,
      liveModelCall: false,
      questionId: 'u-evidence',
    });

    const duplicate = acceptPastedAnalysis(kept.state, {
      executionId: prepared.executionId,
      text: '다른 문장으로 덮어쓴다',
      providerLabel: 'user',
      now: LATER,
    });
    expect(duplicate.accepted).toBe(false);
    expect(duplicate.state.externalNotes).toHaveLength(1);
    expect(duplicate.state.externalNotes?.[0]?.text).toBe(PASTE);

    const answered = applyAnswer(kept.state, { choiceId: 'interview', freeText: ANSWER, now: LATER });
    expect(answered.applied).toBe(true);
    expect(answered.state.externalNotes).toHaveLength(1);
    expect(answered.state.judgmentText).toBe(JUDGMENT_TEXT);
    const next = nextHandoffInput(answered.state);
    expect(next.prompt).toContain(ANSWER);
    expect(next.prompt).toContain(prepared.executionId);
    expect(next.prompt).toContain('이미 답한 질문 ID는 다시 묻지 않는다');
    expect(next.alreadyAnswered).toContain('u-evidence');
    expect(next.prompt).toContain('지금 판단을 바꿀 수 있는 질문: u-episode');
    expect(next.includesAnswerIds).toEqual([answered.state.answers[0]?.id]);
    expect(next.verifiedFact).toBe(false);
  });

  it('does not carry a problem hypothesis onto a new customer as a validated fact', () => {
    const state = started();
    const prepared = prepareAnalysisRequest(state, NOW);
    const kept = acceptPastedAnalysis(state, {
      executionId: prepared.executionId,
      text: PASTE,
      providerLabel: 'user',
      now: NOW,
    });
    const changed = correctField(kept.state, 'customer', '병원 구매팀', LATER);
    expect(changed.applied).toBe(true);
    const next = nextHandoffInput(changed.state);
    expect(next.prompt).toContain('병원 구매팀');
    expect(next.prompt).toContain('이전 문제 가설을 새 고객의 검증된 문제로 옮기지 않는다');
    expect(changed.state.judgmentText).toContain('병원 구매팀');
    expect(changed.state.judgmentText).toContain('검증된 문제가 아니다');
    expect(changed.state.judgmentComparisons?.at(-1)?.realAnalysisSuccess).toBe(false);
    expect(changed.state.externalNotes?.[0]?.text).toBe(PASTE);
  });
});