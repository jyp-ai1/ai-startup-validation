import { describe, expect, it } from 'vitest';

import { applyAnswer, correctField, recordCounterClaim, replayStoredAnswer, startFromBusinessPlan } from '../journey-engine';
import {
  blockersToClose,
  decisionSnapshot,
  LMULM_PLAN_FIXTURE,
  RIDM_PLAN_FIXTURE,
  withFixtureResult,
} from '../plan-journey';
import { renderVerificationDocument } from '../verification-document';
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
    expect(state.nextQuestion?.uncertaintyId).toBe('u-lmulm-mix');
    expect(state.nextQuestion?.purpose).toContain('플랫폼 매출');
    expect(state.nextQuestion?.prompt).not.toContain('고객이 누구');
    expect(JSON.stringify(state)).not.toContain('VALIDATED');
  });

  it('walks an unknown LMULM mix into repurchase tracking without inventing a rate', () => {
    const initial = started(LMULM_PLAN_FIXTURE);
    const mix = answer(initial, 'unknown');

    expect(mix.state.judgmentText).toBe(initial.judgmentText);
    expect(mix.state.judgmentComparisons?.at(-1)?.judgmentChanged).toBe(false);
    expect(mix.state.judgmentComparisons?.at(-1)?.reason).toContain('추정으로 채우지 않는다');
    expect(mix.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-repurchase-track');

    const track = answer(mix.state, 'none');
    expect(track.state.judgmentText).toBe(mix.state.judgmentText);
    expect(track.state.judgmentComparisons?.at(-1)?.judgmentChanged).toBe(false);
    expect(track.state.judgmentComparisons?.at(-1)?.reason).toContain('재구매율을 추정하지 않는다');
    expect(track.state.nextQuestion).toBeNull();
    expect(track.state.nextAction.text).toContain('재구매율');
    expect(track.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('asks a different second question for parent-company revenue than for direct sales', () => {
    const parent = answer(started(LMULM_PLAN_FIXTURE), 'parent');
    const direct = answer(started(LMULM_PLAN_FIXTURE), 'b2c');

    expect(parent.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-independence');
    expect(direct.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-repurchase-track');
    expect(parent.state.judgmentText).toContain('모회사·계열사 판매');
    expect(parent.state.judgmentText).not.toBe(direct.state.judgmentText);
    expect(parent.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(direct.state.judgmentStatus).toBe('judgment_deferred');
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
    expect(payers.state.judgmentComparisons?.at(-1)?.reason).toContain('실제 지불');
    expect(payers.state.nextQuestion?.uncertaintyId).toBe('u-ridm-wtp');
    expect(payers.state.nextQuestion?.prompt).toContain('9,900');

    const wtp = answer(payers.state, 'not_yet');
    expect(wtp.state.judgmentText).toContain('9,900');
    expect(wtp.state.judgmentText).toContain('가정');
    expect(wtp.state.nextQuestion).toBeNull();
    expect(wtp.state.nextAction.text).toContain('결제 원문');
    expect(wtp.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('does not treat an unknown RIDM payer answer as evidence that a payer exists', () => {
    const initial = started(RIDM_PLAN_FIXTURE);
    const unknown = answer(initial, 'unknown');

    expect(unknown.state.judgmentText).toBe(initial.judgmentText);
    expect(unknown.state.judgmentText).not.toContain('유료 고객이 있다');
    expect(unknown.state.judgmentComparisons?.at(-1)?.judgmentChanged).toBe(false);
    expect(unknown.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(unknown.state.judgmentComparisons?.at(-1)?.reason).toContain('근거가 아니다');
    expect(unknown.state.nextQuestion?.uncertaintyId).toBe('u-ridm-wtp');
    expect(unknown.state.hypothesisJudgments.every((item) => item.verifiedFact === false)).toBe(true);
    expect(unknown.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('walks a claimed repurchase trail into contribution margin without inventing a number', () => {
    const direct = answer(started(LMULM_PLAN_FIXTURE), 'b2c');
    const track = answer(direct.state, 'have');

    expect(track.state.judgmentText).toContain('재구매율 숫자는 확인하지 않았다');
    expect(track.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(track.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-margin');

    const margin = answer(track.state, 'can', '비용 항목까지 계산할 수 있다');
    expect(margin.state.judgmentText).toContain('공헌이익');
    expect(margin.state.judgmentText).not.toContain('35%');
    expect(margin.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(margin.state.nextQuestion).toBeNull();
    expect(margin.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('walks a claimed RIDM payer through liking and cost without verifying payment', () => {
    const payers = answer(started(RIDM_PLAN_FIXTURE), 'have_payer', '유료 결제 고객이 있다고 본다');

    expect(payers.state.judgmentText).toContain('유료 고객이 있다는 창업자 진술');
    expect(payers.state.judgmentComparisons?.at(-1)?.verifiedFact).toBe(false);
    expect(payers.state.nextQuestion?.uncertaintyId).toBe('u-ridm-conversion');

    const conversion = answer(payers.state, 'not_measured');
    expect(conversion.state.judgmentText).toContain('3%');
    expect(conversion.state.judgmentText).toContain('실측으로 바뀌지 않는다');
    expect(conversion.state.nextQuestion).toBeNull();
    expect(conversion.state.nextAction.text).toContain('결제 원문');
    expect(conversion.state.judgmentComparisons?.every((item) => item.verifiedFact === false)).toBe(true);
    expect(conversion.state.judgmentStatus).toBe('judgment_deferred');
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
    const state = answer(started(LMULM_PLAN_FIXTURE), 'b2c', '일반 소비자 직접 판매가 가장 크다').state;
    const conflict = recordCounterClaim(state, '그 매출은 발생하지 않았다', NOW);

    expect(conflict.applied).toBe(true);
    expect(conflict.state.answers.map((item) => item.freeText)).toEqual([
      '일반 소비자 직접 판매가 가장 크다',
      '그 매출은 발생하지 않았다',
    ]);
    expect(conflict.state.judgmentText).toContain('둘 다');
    expect(conflict.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.stance).toBe('held');
    expect(conflict.state.hypothesisJudgments.every((item) => item.verifiedFact === false)).toBe(true);
    expect(conflict.state.planCase?.claims.find((item) => item.role === 'past_transaction')?.text).toContain('2,000만');
  });

  it('does not store or restamp a judgment when the same answer is submitted again', () => {
    const once = answer(started(LMULM_PLAN_FIXTURE), 'unknown');
    const forged = { ...once.state, nextQuestion: started(LMULM_PLAN_FIXTURE).nextQuestion };
    const twice = applyAnswer(forged, {
      choiceId: 'unknown',
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
    const done = answer(initial, 'none').state;
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
    const state = answer(started(LMULM_PLAN_FIXTURE, 'user_declared'), 'unknown').state;
    const restored = JSON.parse(JSON.stringify(state)) as JourneyState;

    expect(restored.answers).toHaveLength(1);
    expect(restored.planCase?.profile).toBe('lmulm');
    expect(restored.planCase?.provenance).toBe('user_declared');
    expect(restored.judgmentStatus).toBe('judgment_deferred');
    expect(restored.judgmentText).toContain('과거 거래');
    expect(decisionSnapshot(restored)?.fixtureLabel).toContain('원장 검증 아님');
  });

  it('writes a Hold document that keeps the source claims and drops ungrounded scores', () => {
    const parent = answer(started(LMULM_PLAN_FIXTURE), 'parent');
    const dependent = answer(parent.state, 'required');
    const document = renderVerificationDocument(dependent.state);

    expect(document).toContain('최종 판단: Hold');
    expect(document).toContain('시뮬레이션');
    expect(document).toContain('매출 2,000만 원');
    expect(document).toContain('모회사·계열사 판매');
    expect(document).toContain('사실상 모회사 지원이 필수다');
    expect(document).toContain('검증된 증거');
    expect(document).toContain('없음');
    expect(document).toContain('liveModelCall false');
    expect(document).not.toContain('73점');
    expect(document).not.toContain('62%');
    expect(document).not.toMatch(/사업성 높음/);
    expect(dependent.state.nextQuestion?.uncertaintyId).toBe('u-lmulm-outside');
  });

  it('keeps RIDM forecast targets out of achieved revenue when the price is unchecked', () => {
    const none = answer(started(RIDM_PLAN_FIXTURE), 'none');
    const wtp = answer(none.state, 'one_url');
    const focus = answer(wtp.state, 'saas');
    const document = renderVerificationDocument(focus.state);

    expect(wtp.state.nextQuestion?.uncertaintyId).toBe('u-ridm-focus');
    expect(wtp.state.nextQuestion?.prompt).toContain('하나');
    expect(focus.state.nextQuestion).toBeNull();
    expect(focus.state.judgmentText).toContain('가설');
    expect(focus.state.judgmentText).not.toContain('Go');
    expect(document).toContain('Pre-revenue');
    expect(document).toContain('Hold');
    expect(document).toContain('B2C 구독');
    expect(document).not.toContain('MAU 5만 달성');
  });
});
