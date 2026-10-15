import { describe, expect, it } from 'vitest';

import {
  applyAnswer,
  classifyIncomingAnswer,
  correctField,
  gradeFromIntakeEvidence,
  startJourney,
} from '../journey-engine';
import {
  emptyIntake,
  EVIDENCE_QUESTION,
  gradeLabel,
  TEST_HYPOTHESIS_INTAKE,
  type Intake,
  type JourneyState,
} from '../journey-types';

const NOW = '2026-10-15T02:00:00.000Z';

function started(patch: Partial<Intake> = {}, source: 'founder_input' | 'test_hypothesis' = 'test_hypothesis') {
  const result = startJourney({ ...TEST_HYPOTHESIS_INTAKE, ...patch }, source);
  if (!result.ok) throw new Error(`start failed: ${result.missing.join(',')}`);
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result;
}

function promptsUntilHold(state: JourneyState): string[] {
  const prompts: string[] = [];
  let current = state;
  while (current.nextQuestion) {
    prompts.push(current.nextQuestion.prompt);
    const choice = current.nextQuestion.choices[0];
    if (!choice) break;
    current = answer(current, choice.id).state;
  }
  return prompts;
}

describe('validation journey phase 1-2', () => {
  it('starts without a URL and keeps research, counter-review, and judgment unrun', () => {
    const state = started();

    expect(state.researchStatus).toBe('research_not_run');
    expect(state.researchNote).toContain('URL이 없다');
    expect(state.counterReviewStatus).toBe('counter_review_not_run');
    expect(state.judgmentStatus).toBe('judgment_deferred');
    expect(state.judgmentText).toContain('유보');
    expect(state.captures).toEqual([]);
    expect(state.analysisDelivery.status).toBe('not_sent');
    expect(state.source).toBe('test_hypothesis');
    expect(state.nextQuestion?.prompt).toBe(EVIDENCE_QUESTION);
    expect(state.nextQuestion?.whyDifferent).toBeNull();
    expect(state.understanding.known.map((item) => item.text).join('\n')).toContain(
      TEST_HYPOTHESIS_INTAKE.business,
    );
    expect(state.understanding.inferred[0]?.text).toContain('잠정 해석');
    expect(state.understanding.inferred[0]?.text).toContain('월 구독료');
    expect(state.understanding.unknown.map((item) => item.text).join('\n')).toContain(
      '얼마나 자주',
    );
    expect(JSON.stringify(state)).not.toContain('VALIDATED');
  });

  it('stores a URL and still does not mark research as run', () => {
    const state = started({ url: '  https://example.com/shop  ' });

    expect(state.intake.url).toBe('https://example.com/shop');
    expect(state.researchStatus).toBe('research_not_run');
    expect(state.researchNote).toContain('페이지는 열지 않았다');
  });

  it('refuses to start when business, customer, or problem is blank', () => {
    const result = startJourney({ ...emptyIntake(), business: '  ', customer: '꽃집', problem: '' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(['business', 'problem']);
  });

  it('keeps a founder claim distinct from a verified fact', () => {
    const state = started({ payer: 'unknown' });
    const result = answer(state, 'paid_customer', '단골 두 곳이 결제했다고 기억한다');
    const recorded = result.state.answers[0];

    expect(recorded?.grade).toBe('claimed_record');
    expect(recorded?.delta).toBe('conflict_opened');
    expect(recorded?.freeText).toContain('단골');
    expect(recorded?.claimLabel).toContain('검증된 사실 아님');
    expect(result.state.judgmentStatus).toBe('judgment_deferred');
    expect(result.state.judgmentText).toBe(state.judgmentText);
    expect(result.state.understanding.contradictions.map((item) => item.id)).toContain('c-payer');
    expect(result.state.nextQuestion?.uncertaintyId).toBe('u-episode');
    expect(result.state.nextQuestion?.prompt).not.toBe(EVIDENCE_QUESTION);
  });

  it('stores a multiple-choice answer and optional free text without closing the unknown', () => {
    const result = answer(started(), 'interview', '꽃집 두 곳이 매주 누락을 말했다');
    const recorded = result.state.answers[0];

    expect(recorded).toMatchObject({
      uncertaintyId: 'u-evidence',
      choiceId: 'interview',
      grade: 'founder_estimate',
      delta: 'detail_added',
      material: true,
      freeText: '꽃집 두 곳이 매주 누락을 말했다',
    });
    expect(result.reason).toContain('검증된 사실이 아니다');
    expect(result.state.understanding.unknown.find((item) => item.id === 'u-observed')?.text).toContain(
      '비용을 지불하거나',
    );
    expect(result.state.nextQuestion?.whyDifferent).toContain('같은 질문을 반복하지 않고');
  });

  it('keeps both customer statements and does not return to an answered question', () => {
    const afterEvidence = answer(started(), 'hypothesis').state;
    const corrected = correctField(afterEvidence, 'customer', '배송 대행을 쓰는 동네 서점', NOW);

    expect(corrected.applied).toBe(true);
    expect(corrected.state.intake.customer).toBe('배송 대행을 쓰는 동네 서점');
    expect(corrected.state.understanding.known.map((item) => item.text).join('\n')).toContain('동네 서점');
    expect(corrected.state.understanding.contradictions.map((item) => item.text).join('\n')).toContain(
      TEST_HYPOTHESIS_INTAKE.customer,
    );
    expect(corrected.state.understanding.contradictions.map((item) => item.text).join('\n')).toContain(
      '동네 서점',
    );
    expect(corrected.state.nextQuestion?.uncertaintyId).toBe('u-episode');
    expect(corrected.state.nextQuestion?.prompt).not.toBe(EVIDENCE_QUESTION);
    expect(corrected.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('does not change understanding when the same customer statement is submitted again', () => {
    const state = started();
    const again = correctField(state, 'customer', state.intake.customer, NOW);

    expect(again.applied).toBe(true);
    expect(again.state.revisions[0]?.delta).toBe('duplicate');
    expect(again.state.revisions[0]?.material).toBe(false);
    expect(again.state.understanding).toEqual(state.understanding);
    expect(again.state.nextQuestion).toEqual(state.nextQuestion);
    expect(again.reason).toContain('다시 내지 않는다');
  });

  it('does not ask the evidence menu again when the intake already named a grade', () => {
    const none = started({ evidence: 'none' });
    const interview = started({ evidence: 'interview' });
    const payment = started({ evidence: 'payment', payer: 'unknown' });

    expect(gradeFromIntakeEvidence('none')).toBe('no_evidence');
    expect(gradeFromIntakeEvidence('interview')).toBe('founder_estimate');
    expect(gradeFromIntakeEvidence('payment')).toBe('claimed_record');
    expect(none.nextQuestion?.uncertaintyId).toBe('u-episode');
    expect(none.nextQuestion?.whyDifferent).toContain('같은 선택 메뉴를 반복하지 않고');
    expect(none.understanding.known.map((item) => item.text).join('\n')).toContain(gradeLabel('no_evidence'));
    expect(interview.nextQuestion?.choices.find((choice) => choice.id === 'have_scene')?.grade).toBe(
      'founder_estimate',
    );
    expect(payment.understanding.contradictions.map((item) => item.id)).toContain('c-payer');
    expect(payment.nextQuestion?.prompt).not.toBe(EVIDENCE_QUESTION);
    expect(promptsUntilHold(started({ payer: 'unknown' })).join('\n')).not.toContain('누가 비용을 지불하나요?');
  });

  it('separates unknown, no evidence, founder estimate, and a claimed record', () => {
    expect(new Set([
      gradeLabel('unknown'),
      gradeLabel('no_evidence'),
      gradeLabel('founder_estimate'),
      gradeLabel('claimed_record'),
    ]).size).toBe(4);

    const unknown = answer(started(), 'unknown');
    const estimate = answer(started(), 'hypothesis');
    const record = answer(started({ payer: 'owner' }), 'usage_record');

    expect(unknown.state.answers[0]?.grade).toBe('unknown');
    expect(estimate.state.answers[0]?.grade).toBe('founder_estimate');
    expect(record.state.answers[0]?.grade).toBe('claimed_record');
    expect(record.state.understanding.contradictions).toEqual([]);
    expect(record.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('classifies a repeated choice and text as a non-material duplicate', () => {
    const intake = { ...TEST_HYPOTHESIS_INTAKE, payer: 'unknown' as const };
    const first = classifyIncomingAnswer([], 'u-evidence', 'hypothesis', '같은 문장', 'founder_estimate', intake);
    const existing = answer(started(intake), 'hypothesis', '같은 문장').state.answers;
    const second = classifyIncomingAnswer(
      existing,
      'u-evidence',
      'hypothesis',
      '같은 문장',
      'founder_estimate',
      intake,
    );

    expect(first).toEqual({ delta: 'detail_added', material: true });
    expect(second).toEqual({ delta: 'duplicate', material: false });
  });

  it('asks each remaining question once, then holds the deferred judgment', () => {
    const state = started();
    const prompts = promptsUntilHold(state);

    expect(new Set(prompts).size).toBe(prompts.length);
    expect(prompts[0]).toBe(EVIDENCE_QUESTION);
    expect(prompts).not.toContain('누가 비용을 지불하나요?');

    let current = state;
    while (current.nextQuestion) {
      const choice = current.nextQuestion.choices[0];
      if (!choice) break;
      current = answer(current, choice.id).state;
    }

    expect(current.nextQuestion).toBeNull();
    expect(current.nextAction.kind).toBe('external_validation');
    expect(current.judgmentStatus).toBe('judgment_deferred');
    expect(current.answers.length).toBe(prompts.length);
    const refused = applyAnswer(current, { choiceId: 'unknown', freeText: '', now: NOW });
    expect(refused.applied).toBe(false);
    expect(refused.state).toBe(current);
  });

  it('keeps the draft when the choice is not one of the offered options', () => {
    const state = started();
    const refused = applyAnswer(state, { choiceId: 'not-a-choice', freeText: '남김', now: NOW });

    expect(refused.applied).toBe(false);
    expect(refused.state).toBe(state);
    expect(refused.reason).toContain('초안은 그대로');
  });

  it('does not label the same words as the test hypothesis unless that source is chosen', () => {
    const manual = startJourney(TEST_HYPOTHESIS_INTAKE, 'founder_input');
    if (!manual.ok) throw new Error('expected start');

    expect(manual.state.source).toBe('founder_input');
    expect(manual.state.judgmentStatus).toBe('judgment_deferred');
    expect(JSON.stringify(manual.state)).not.toContain('VALIDATED');
  });

  it('records a named payer as a statement and still withholds the judgment', () => {
    const state = started({ payer: '', revenue: '', evidence: '' }, 'founder_input');
    const afterEvidence = answer(state, 'hypothesis').state;
    const afterScene = answer(afterEvidence, 'no_scene').state;

    expect(afterScene.nextQuestion?.uncertaintyId).toBe('u-payer');
    const named = answer(afterScene, 'owner');

    expect(named.state.intake.payer).toBe('owner');
    expect(named.state.understanding.known.map((item) => item.text).join('\n')).toContain('사업자 본인');
    expect(named.state.nextQuestion?.prompt).not.toBe('누가 비용을 지불하나요?');
    expect(named.state.judgmentStatus).toBe('judgment_deferred');
    expect(named.state.researchStatus).toBe('research_not_run');
    expect(named.state.counterReviewStatus).toBe('counter_review_not_run');
  });
});
