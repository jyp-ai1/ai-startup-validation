import { describe, expect, it } from 'vitest';

import { applyAnswer, startFromBusinessPlan } from '../journey-engine';
import { LMULM_PLAN_FIXTURE, RIDM_PLAN_FIXTURE } from '../plan-journey';
import { recordDesignAnswer, refinePlan } from '../plan-refinement';
import type { JourneyState } from '../journey-types';

const NOW = '2026-10-15T12:40:00.000Z';

function started(text: string) {
  const result = startFromBusinessPlan({
    text,
    sourceLabel: '테스트 발췌',
    provenance: 'test_fixture',
  });
  if (!result.ok) throw new Error(result.missing.join(','));
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result.state;
}

describe('plan refinement loop', () => {
  it('rewrites the LMULM plan when repeat purchase stays an assumption', () => {
    const initial = refinePlan(started(LMULM_PLAN_FIXTURE));
    const afterUnknown = answer(answer(started(LMULM_PLAN_FIXTURE), 'unknown'), 'none');
    const pass1 = refinePlan(afterUnknown);
    const pass2 = refinePlan(
      recordDesignAnswer(afterUnknown, {
        text: '수집가에게 출시 일정 알림을 먼저 제공하고, 리셀 수수료는 반복 주문이 보이기 전까지 넣지 않는다.',
        stance: 'hypothesis',
        now: NOW,
      }).state,
    );

    expect(initial?.pass).toBe(0);
    expect(initial?.liveModelCall).toBe(false);
    expect(initial?.businessModel).toContain('한 사업');
    expect(initial?.nextStep).toContain('재구매');
    expect(pass1?.pass).toBe(1);
    expect(pass1?.businessModel).toContain('한 모델로 두지 않는다');
    expect(pass1?.businessModel).not.toBe(initial?.businessModel);
    expect(pass1?.changed.join(' ')).toContain('수수료');
    expect(pass1?.unchanged.join(' ')).toContain('2,000만');
    expect(pass1?.nextStep).toContain('90일');
    expect(pass1?.verifiedFact).toBe(false);
    expect(pass1?.assumptions.join(' ')).toContain('가정');
    expect(pass2?.pass).toBe(2);
    expect(pass2?.businessModel).toContain('일정 알림');
    expect(pass2?.price).toContain('넣지 않는다');
    expect(pass2?.nextStep).toContain('재구매율 질문은 반복하지 않는다');
    expect(pass2?.judgment).toContain('유보');
    expect(JSON.stringify(pass2)).not.toContain('liveModelCall":true');
  });

  it('rewrites the RIDM plan around a creator URL experiment without treating the forecast as revenue', () => {
    const initial = refinePlan(started(RIDM_PLAN_FIXTURE));
    const afterNone = answer(started(RIDM_PLAN_FIXTURE), 'none', '유료 고객은 아직 없다');
    const pass1 = refinePlan(afterNone);
    const pass2 = refinePlan(
      recordDesignAnswer(afterNone, {
        text: '첫 실험은 창작자가 캐릭터 URL 하나를 여는 지불 의향이다. 가격은 9,900원으로 고정하지 않는다.',
        stance: 'hypothesis',
        now: NOW,
      }).state,
    );

    expect(initial?.pass).toBe(0);
    expect(initial?.externalNotes.join(' ')).toContain('모델을 호출하지 않았다');
    expect(initial?.price).toContain('9,900');
    expect(pass1?.businessModel).toContain('Pre-revenue');
    expect(pass1?.price).toContain('문서 가정');
    expect(pass1?.unchanged.join(' ')).toContain('산술');
    expect(pass1?.nextStep).toContain('전환율 가정을 다시 설명하지 않는다');
    expect(pass1?.verifiedFact).toBe(false);
    expect(pass2?.customer).toContain('개인 창작자');
    expect(pass2?.customer).toContain('이번 실험의 고객이 아니다');
    expect(pass2?.price).toContain('실험 가격으로 쓰지 않는다');
    expect(pass2?.execution).toContain('매출이 아니다');
    expect(pass2?.nextStep).toContain('다시 묻지 않는다');
    expect(pass2?.changed.join(' ')).toContain('9,900');
  });

  it('does not rewrite the plan when the same design answer is submitted again', () => {
    const once = recordDesignAnswer(answer(started(LMULM_PLAN_FIXTURE), 'unknown'), {
      text: '반복 구매는 가정이다.',
      stance: 'hypothesis',
      now: NOW,
    });
    const twice = recordDesignAnswer(once.state, {
      text: '반복 구매는 가정이다.',
      stance: 'hypothesis',
      now: NOW,
    });

    expect(once.applied).toBe(true);
    expect(twice.applied).toBe(false);
    expect(twice.state.answers).toHaveLength(once.state.answers.length);
    expect(refinePlan(twice.state)?.businessModel).toBe(refinePlan(once.state)?.businessModel);
  });
});
