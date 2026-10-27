import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { applyAnswer, startFromBusinessPlan, startJourney } from '../journey-engine';
import { LMULM_PLAN_FIXTURE, RIDM_PLAN_FIXTURE } from '../plan-journey';
import type { JourneyState } from '../journey-types';

const NOW = '2026-10-27T06:10:00.000Z';
const INCIDENT =
  '최근 한 달 동안 재고나 배송 실수로 실제 손실이 발생한 사례가 있나요? 있다면 어떤 일이었고 얼마나 손실이 났나요?';

const BANCHAN = {
  business: '동네 반찬가게가 배송 주문·재고·단골 관리를 수기로 하다 놓치는 문제를 해결하는 B2B SaaS',
  customer: '동네 반찬가게 사장님',
  problem: '배송 주문, 재고, 단골 관리를 수기로 하다 놓친다',
  solution: '',
  payer: '' as const,
  revenue: '' as const,
  evidence: '' as const,
  url: '',
};

function started() {
  const result = startJourney(BANCHAN, 'founder_input');
  if (!result.ok) throw new Error(result.missing.join(','));
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result;
}

describe('short business idea review', () => {
  it('states the banchan claims and asks for a recent loss without inventing a price', () => {
    const state = started();

    expect(state.judgmentStatus).toBe('judgment_deferred');
    expect(state.judgmentText).toContain('동네 반찬가게 사장님');
    expect(state.judgmentText).toContain('배송 주문, 재고, 단골 관리를 수기로 하다 놓친다');
    expect(state.judgmentText).toContain('구매 결정권자');
    expect(state.judgmentText).toContain('만들지 않는다');
    expect(state.judgmentText).toContain('유보');
    expect(state.judgmentText).not.toMatch(/9,900|ARR|MAU|월\s*\d+/);
    expect(state.nextQuestion?.prompt).toBe(INCIDENT);
    expect(state.nextQuestion?.uncertaintyId).toBe('u-short-incident');
    expect(state.planCase).toBeUndefined();
    expect(JSON.stringify(state)).not.toContain('VALIDATED');
  });

  it('keeps the judgment when the loss case is unknown and then asks who decides to pay', () => {
    const state = started();
    const result = answer(state, 'unknown');

    expect(result.state.judgmentText).toBe(state.judgmentText);
    expect(result.reason).toContain('판단 문장은 유지');
    expect(result.reason).toContain('가격을 추정으로 채우지');
    expect(result.state.nextQuestion?.uncertaintyId).toBe('u-short-buyer');
    expect(result.state.nextQuestion?.prompt).toContain('동네 반찬가게 사장님');
    expect(result.state.nextQuestion?.prompt).toContain('구매를 결정');
  });

  it('records a stated loss without turning it into a verified amount, then separates the buyer', () => {
    const result = answer(started(), 'have_case', '지난주 배송 2건을 빠뜨렸다');

    expect(result.state.judgmentText).toContain('지난주 배송 2건을 빠뜨렸다');
    expect(result.state.judgmentText).toContain('확인된 손실액으로 올리지 않는다');
    expect(result.state.judgmentText).toContain('유보');
    expect(result.reason).toContain('구매 결정권자');
    expect(result.state.nextQuestion?.uncertaintyId).toBe('u-short-buyer');

    const buyer = answer(result.state, 'same');
    expect(buyer.state.judgmentText).toContain('적힌 고객이 직접 쓰고 결제도 한다');
    expect(buyer.state.judgmentText).toContain('결제 관찰은 없다');
    expect(buyer.state.nextQuestion?.uncertaintyId).toBe('u-short-wtp');
    expect(buyer.state.nextQuestion?.prompt).not.toMatch(/\d/);
    expect(buyer.state.nextQuestion?.prompt).toContain('가격은 입력에 없으면 제안하지 않습니다');
  });

  it('does not invent a loss amount when the case has no number', () => {
    const result = answer(started(), 'have_case', '재고를 놓친 날이 있었다');

    expect(result.state.judgmentText).toContain('손실 금액은 적히지 않았다');
    expect(result.state.judgmentText).toContain('금액을 만들지 않는다');
  });

  it('moves from no recent case to the buyer, and does not ask willingness before a case exists', () => {
    const result = answer(started(), 'none');

    expect(result.state.judgmentText).toContain('최근 한 달 손실 사례는 아직 없다');
    expect(result.state.judgmentText).not.toMatch(/9,900|월\s*\d+/);
    expect(result.state.nextQuestion?.uncertaintyId).toBe('u-short-buyer');
    const buyer = answer(result.state, 'unknown');
    expect(buyer.state.judgmentText).toBe(result.state.judgmentText);
    expect(buyer.reason).toContain('판단 문장은 유지');
    expect(buyer.state.nextQuestion?.uncertaintyId).toBe('u-short-focus');
    expect(buyer.state.nextQuestion?.prompt).toContain('재고');
    expect(buyer.state.nextQuestion?.prompt).toContain('배송');
    expect(buyer.state.nextQuestion?.prompt).toContain('단골 관리');
  });

  it('reads a short note that is not an LMULM or RIDM plan', () => {
    const text = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '../../../../e2e/fixtures/p0-11-banchan-plan.txt'),
      'utf8',
    );
    const result = startFromBusinessPlan({
      text,
      sourceLabel: '기존 짧은 샘플',
      provenance: 'test_fixture',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.planCase).toBeUndefined();
    expect(result.state.intake.customer).toBe('동네 반찬가게 사장님');
    expect(result.state.intake.problem).toContain('배송 스케줄');
    expect(result.state.nextQuestion?.prompt).toBe(INCIDENT);
    expect(result.state.judgmentText).toContain('테스트 픽스처로 표시되었다');
    expect(result.state.judgmentText).toContain('실제 사업 증거가 아니다');
  });

  it('keeps the LMULM and RIDM fixture questions', () => {
    const lmulm = startFromBusinessPlan({
      text: LMULM_PLAN_FIXTURE,
      sourceLabel: '초기창업패키지 사업계획서 발췌',
      provenance: 'test_fixture',
    });
    const ridm = startFromBusinessPlan({
      text: RIDM_PLAN_FIXTURE,
      sourceLabel: 'RIDM AI 투자자 사업계획서 발췌',
      provenance: 'test_fixture',
    });
    if (!lmulm.ok || !ridm.ok) throw new Error('fixture start failed');

    expect(lmulm.state.planCase?.profile).toBe('lmulm');
    expect(lmulm.state.judgmentText).toContain('2023년 8~12월 매출 2,000만 원');
    expect(lmulm.state.judgmentText).toContain('거래 예정');
    expect(lmulm.state.nextQuestion?.prompt).toBe('문서에 적힌 매출 2,000만 원의 가장 큰 비중은 어디입니까?');
    expect(ridm.state.planCase?.profile).toBe('ridm');
    expect(ridm.state.judgmentText).toContain('Pre-revenue');
    expect(ridm.state.nextQuestion?.prompt).toBe('현재 돈을 지불한 고객이 있습니까?');
    expect(lmulm.state.nextQuestion?.prompt).not.toBe(INCIDENT);
    expect(ridm.state.nextQuestion?.prompt).not.toBe(INCIDENT);
  });
});
