import { describe, expect, it } from 'vitest';

import { applyAnswer, correctField, recordCounterClaim, replayStoredAnswer, startFromBusinessPlan } from '../journey-engine';
import {
  blockersToClose,
  decisionSnapshot,
  LMULM_PLAN_FIXTURE,
  RIDM_PLAN_FIXTURE,
  withFixtureResult,
} from '../plan-journey';
import type { JourneyState } from '../journey-types';

const NOW = '2026-10-15T10:30:00.000Z';

function started(text: string, provenance: 'test_fixture' | 'user_declared' = 'test_fixture') {
  const result = startFromBusinessPlan({
    text,
    sourceLabel: provenance === 'test_fixture' ? '테스트 발췌' : '창업자가 가져온 사업계획서',
    provenance,
  });
  if (!result.ok) throw new Error(result.missing.join(','));
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result;
}

describe('business plan journey', () => {
  it('LMULM-01 separates a past transaction claim from the resale hypothesis', () => {
    const state = started(LMULM_PLAN_FIXTURE);
    const roles = state.planCase?.claims.map((item) => item.role) ?? [];

    expect(roles).toContain('past_transaction');
    expect(roles).toContain('resale_hypothesis');
    expect(state.judgmentText).toContain('과거 거래');
    expect(state.judgmentText).toContain('리셀');
    expect(state.judgmentStatus).toBe('judgment_deferred');
    expect(state.researchStatus).toBe('research_not_run');
    expect(state.planCase?.claims.every((item) => item.ledgerChecked === false)).toBe(true);
    expect(state.planCase?.claims.every((item) => item.claimStatus === 'CLAIM')).toBe(true);
    expect(decisionSnapshot(state)?.fixtureLabel).toContain('테스트 픽스처');
    expect(state.nextQuestion?.uncertaintyId).toBe('u-lmulm-ledger');
    expect(state.nextQuestion?.purpose).toContain('원장');
    expect(JSON.stringify(state)).not.toContain('VALIDATED');
  });

  it('walks LMULM ledger, unknown repurchase, and margin into a verification action', () => {
    const initial = started(LMULM_PLAN_FIXTURE);
    const ledger = answer(initial, 'happened', '2023년 매출 2,000만 원은 실제 발생했다');

    expect(ledger.state.judgmentText).toContain('주장');
    expect(ledger.state.judgmentText).toContain('원장 검증은 미확인');
    expect(ledger.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(ledger.state.judgmentComparisons?.at(-1)?.judgmentChanged).toBe(true);
    expect(ledger.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-repurchase');

    const repurchase = answer(ledger.state, 'unknown');
    expect(repurchase.state.judgmentText).toBe(ledger.state.judgmentText);
    expect(repurchase.state.judgmentComparisons?.at(-1)?.reason).toContain('재구매 코호트');
    expect(repurchase.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-margin');
    expect(repurchase.state.nextQuestion?.prompt).not.toContain('재구매율을 알고');

    const margin = answer(repurchase.state, 'margin_35', '상품 마진은 35%다');
    expect(margin.state.judgmentText).toContain('매출총이익');
    expect(margin.state.judgmentText).toContain('공헌이익');
    expect(margin.state.nextQuestion).toBeNull();
    expect(margin.state.nextAction.kind).toBe('external_validation');
    expect(margin.state.nextAction.text).toContain('공헌이익');
    expect(margin.state.nextAction.text).toContain('재구매 코호트');
    expect(margin.state.answers).toHaveLength(3);
    expect(margin.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('RIDM-01 separates pre-revenue from the revenue forecast', () => {
    const state = started(RIDM_PLAN_FIXTURE);
    const roles = state.planCase?.claims.map((item) => item.role) ?? [];

    expect(roles).toContain('pre_revenue');
    expect(roles).toContain('forecast');
    expect(state.judgmentText).toContain('Pre-revenue');
    expect(state.judgmentText).toContain('미래 가정');
    expect(state.nextQuestion?.uncertaintyId).toBe('u-ridm-payers');
    expect(decisionSnapshot(state)?.verifiedFact).toBe(false);
  });

  it('walks RIDM no payer, liking, and unknown cost without promoting a forecast', () => {
    const initial = started(RIDM_PLAN_FIXTURE);
    const payers = answer(initial, 'none', '유료 고객은 아직 없다');

    expect(payers.state.judgmentText).toContain('전환율 가정은 실적이 아니다');
    expect(payers.state.nextQuestion?.uncertaintyId).toBe('u-ridm-liking');
    expect(payers.state.nextQuestion?.prompt).not.toContain('전환율');

    const beforeLiking = payers.state.judgmentText;
    const liking = answer(payers.state, 'likes', '고객이 AI 캐릭터를 좋아한다고 했다');
    expect(liking.state.judgmentText).toBe(beforeLiking);
    expect(liking.state.judgmentComparisons?.at(-1)?.reason).toContain('호감');
    expect(liking.state.judgmentComparisons?.at(-1)?.judgmentChanged).toBe(false);
    expect(liking.state.nextQuestion?.uncertaintyId).toBe('u-ridm-cost');

    const cost = answer(liking.state, 'unknown', '고객당 추론 비용을 모른다');
    expect(cost.state.judgmentText).toBe(beforeLiking);
    expect(cost.state.judgmentComparisons?.at(-1)?.reason).toContain('사용량');
    expect(cost.state.nextQuestion).toBeNull();
    expect(cost.state.nextAction.text).toContain('결제 원문');
    expect(cost.state.nextAction.text).toContain('인프라');
    expect(cost.state.answers).toHaveLength(3);
  });

  it('does not transfer the previous customer problem when the customer changes', () => {
    const state = started(LMULM_PLAN_FIXTURE);
    const changed = correctField(state, 'customer', '기업 총무팀', NOW);

    expect(changed.state.nextQuestion?.uncertaintyId).toBe('u-customer-scope');
    expect(changed.state.nextQuestion?.prompt).not.toContain('주문과 배송');
    expect(changed.state.nextQuestion?.whyDifferent).toContain('옮기지 않는다');
    expect(changed.state.judgmentText).toContain('적용 범위를 다시 연다');
    expect(changed.state.planCase?.claims.find((item) => item.role === 'problem')?.text).toContain('재판매');
    expect(changed.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('keeps both sides when a later note contradicts the sales claim', () => {
    const state = answer(started(LMULM_PLAN_FIXTURE), 'happened', '2023년 매출 2,000만 원은 실제 발생했다').state;
    const conflict = recordCounterClaim(state, '그 매출은 발생하지 않았다', NOW);

    expect(conflict.applied).toBe(true);
    expect(conflict.state.answers.map((item) => item.freeText)).toEqual([
      '2023년 매출 2,000만 원은 실제 발생했다',
      '그 매출은 발생하지 않았다',
    ]);
    expect(conflict.state.judgmentText).toContain('둘 다');
    expect(conflict.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.stance).toBe('held');
    expect(conflict.state.hypothesisJudgments.every((item) => item.verifiedFact === false)).toBe(true);
    expect(conflict.state.planCase?.claims.find((item) => item.role === 'past_transaction')?.text).toContain('2,000만');
  });

  it('does not store or restamp a judgment when the same answer is submitted again', () => {
    const once = answer(started(LMULM_PLAN_FIXTURE), 'happened');
    const forged = { ...once.state, nextQuestion: started(LMULM_PLAN_FIXTURE).nextQuestion };
    const twice = applyAnswer(forged, {
      choiceId: 'happened',
      freeText: '',
      now: NOW,
    });
    const replay = replayStoredAnswer(once.state, once.state.answers[0]?.id ?? '');

    expect(twice.applied).toBe(false);
    expect(twice.state).toBe(forged);
    expect(twice.state.answers).toHaveLength(1);
    expect(twice.state.judgmentText).toBe(once.state.judgmentText);
    expect(replay.applied).toBe(false);
    expect(replay.state.judgmentComparisons).toHaveLength(once.state.judgmentComparisons?.length ?? 0);
  });

  it('refuses to close while verification results are absent', () => {
    const initial = started(RIDM_PLAN_FIXTURE);
    const done = answer(answer(answer(initial, 'none').state, 'likes').state, 'unknown').state;
    const blocked = blockersToClose(done);
    const fixture = withFixtureResult(done, '전환율 3% 테스트 문장', NOW);

    expect(blocked.closed).toBe(false);
    expect(blocked.unresolved.join(' ')).toContain('최초 유료 결제');
    expect(blocked.reason).toContain('완료로 바꾸지 않는다');
    expect(fixture.judgmentText).toBe(done.judgmentText);
    expect(fixture.planCase?.fixtureResults[0]?.label).toContain('실제 검증 완료 아님');
    expect(fixture.planCase?.fixtureResults[0]?.verifiedFact).toBe(false);
    expect(fixture.judgmentStatus).toBe('judgment_deferred');
  });

  it('keeps the answer and judgment history through a session round trip', () => {
    const state = answer(started(LMULM_PLAN_FIXTURE, 'user_declared'), 'document_only').state;
    const restored = JSON.parse(JSON.stringify(state)) as JourneyState;

    expect(restored.answers).toHaveLength(1);
    expect(restored.planCase?.profile).toBe('lmulm');
    expect(restored.planCase?.provenance).toBe('user_declared');
    expect(restored.judgmentStatus).toBe('judgment_deferred');
    expect(restored.judgmentText).toContain('과거 거래');
    expect(decisionSnapshot(restored)?.fixtureLabel).toContain('원장 검증 아님');
  });
});
