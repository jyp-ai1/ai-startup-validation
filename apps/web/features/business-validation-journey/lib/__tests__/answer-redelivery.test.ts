import { describe, expect, it } from 'vitest';

import {
  addCapture,
  classifyCounterReview,
  classifyResearch,
  contextReady,
  proposeJudgmentChange,
} from '../answer-redelivery';
import { applyAnswer, correctField, startJourney } from '../journey-engine';
import { TEST_HYPOTHESIS_INTAKE, type JourneyState } from '../journey-types';

const NOW = '2026-10-15T02:50:00.000Z';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result.state;
}

describe('answer redelivery contract', () => {
  it('keeps the first intake off the model path', () => {
    const state = started();

    expect(state.redelivery?.reinvestigation).toBe('skipped');
    expect(state.redelivery?.sent).toBe(false);
    expect(state.redelivery?.researchStatus).toBe('research_not_run');
    expect(state.redelivery?.counterReviewStatus).toBe('counter_review_not_run');
    expect(state.redelivery?.judgmentChange).toBe('preserved');
    expect(state.analysisDelivery.status).toBe('not_sent');
  });

  it('includes problem, solution, payer, and prior answers when the customer changes', () => {
    const evidence = answer(started(), 'interview', '꽃집 한 곳이 말했다');
    const scene = answer(evidence, 'no_scene');
    const corrected = correctField(scene, 'customer', '대기업 물류본부', NOW).state;
    const relay = corrected.redelivery;
    const included = relay?.items.filter((item) => item.disposition === 'included') ?? [];

    expect(relay?.changeClass).toBe('core_hypothesis_change');
    expect(relay?.reinvestigation).toBe('required');
    expect(relay?.inputReady).toBe(true);
    expect(relay?.sent).toBe(false);
    expect(included.map((item) => item.role)).toEqual(
      expect.arrayContaining(['customer', 'problem', 'solution', 'payer', 'revenue', 'answer']),
    );
    expect(included.find((item) => item.id === 'intake:problem')?.relevance).toBe('unconfirmed');
    expect(included.find((item) => item.id === 'intake:problem')?.reason).toContain('유효하다고 보지 않는다');
    expect(included.find((item) => item.id === 'intake:problem')?.text).toContain('주문 접수');
    expect(included.find((item) => item.id === 'intake:solution')?.text).toContain('구독형');
    expect(included.find((item) => item.id === 'intake:payer')?.text).toBe('사업자 본인');
    expect(included.find((item) => item.id === 'rev-1')?.text).toContain('대기업 물류본부');
    expect(included.find((item) => item.id === 'rev-1')?.text).toContain('음식점');
    expect(relay?.includedAnswerIds).toEqual(['ans-1', 'ans-2']);
    expect(relay?.omittedAnswerIds).toEqual([]);
    expect(corrected.answers).toHaveLength(2);
    expect(corrected.judgmentText).toContain('적용 범위를 다시 연다');
    expect(corrected.judgmentText).not.toBe(scene.judgmentText);
    expect(
      contextReady(
        included.filter((item) => item.role !== 'problem'),
        ['customer', 'problem', 'solution', 'payer', 'revenue'],
      ).ready,
    ).toBe(false);
  });

  it('skips a repeated statement and keeps the deferred judgment', () => {
    const state = answer(started(), 'hypothesis');
    const before = state.judgmentText;
    const again = correctField(state, 'customer', state.intake.customer, NOW).state;

    expect(again.redelivery?.reinvestigation).toBe('skipped');
    expect(again.redelivery?.reason).toContain('재조사를 생략');
    expect(again.redelivery?.omittedAnswerIds).toEqual(['ans-1']);
    expect(again.judgmentText).toBe(before);
    expect(again.researchStatus).toBe('research_not_run');
  });

  it('does not count the same page hash as new evidence', () => {
    const first = addCapture([], {
      id: 'cap-1',
      url: 'https://example.com/shop',
      excerpt: '주문과 배송',
      pageHash: 'hash-a',
    });
    const second = addCapture(first.captures, {
      id: 'cap-2',
      url: 'https://example.com/shop',
      excerpt: '주문과 배송',
      pageHash: 'hash-a',
    });

    expect(first.added).toBe(true);
    expect(second.added).toBe(false);
    expect(second.captures).toHaveLength(1);
    expect(second.reason).toContain('같은 페이지 해시');
  });

  it('rejects a judgment change that has no cause id', () => {
    const state = started();
    const proposal = proposeJudgmentChange({
      previousText: state.judgmentText,
      nextText: '이 사업은 검증되었다.',
      causeIds: [],
    });

    expect(proposal.accepted).toBe(false);
    expect(proposal.text).toBe(state.judgmentText);
    expect(proposal.reason).toContain('원인 ID');
  });

  it('keeps a renamed provider on the Gemini model as counter review not run', () => {
    expect(
      classifyCounterReview({
        providerId: 'openai',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        modelId: 'google/gemini-2.5-flash',
        executed: true,
        liveCall: true,
      }),
    ).toBe('counter_review_not_run');

    expect(
      classifyCounterReview({
        providerId: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        modelId: 'gpt-4o-mini',
        executed: false,
        liveCall: false,
      }),
    ).toBe('counter_review_not_run');

    expect(
      classifyResearch({
        providerId: 'openrouter',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        modelId: 'google/gemini-2.5-flash',
        executed: false,
        liveCall: false,
        captureId: null,
      }),
    ).toBe('research_not_run');
  });
});