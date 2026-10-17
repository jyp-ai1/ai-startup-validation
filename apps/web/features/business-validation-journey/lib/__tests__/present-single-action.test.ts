import { describe, expect, it } from 'vitest';

import { applyAnswer, startFromBusinessPlan } from '../journey-engine';
import { LMULM_PLAN_FIXTURE, RIDM_PLAN_FIXTURE } from '../plan-journey';
import { presentSingleDiagnosticAction } from '../present-single-action';
import { renderVerificationDocument } from '../verification-document';
import { verificationActionFor } from '../verification-action';
import type { JourneyState } from '../journey-types';

const NOW = '2026-10-16T09:08:00.000Z';
const S3_TO_S6 = `
모회사와 상품 공급 계약 체결 (예상 연매출 10억)
모회사 오프라인 매장 PB 상품 납품 (예상 연매출 1억)
그룹사 VIP 선물 대량 납품 계약 체결 (예상 매출 4억)
사내벤처 모기업 온라인 쇼핑몰(회원수 2,000만 명)을 활용하여 보장된 시장을 대 상으로 초기 고객을 확보할 계획임`;

function started(text: string) {
  const result = startFromBusinessPlan({
    text,
    sourceLabel: '테스트 발췌',
    provenance: 'test_fixture',
  });
  if (!result.ok) throw new Error(result.missing.join(','));
  return result.state;
}

function answer(state: JourneyState, choiceId: string) {
  const result = applyAnswer(state, { choiceId, freeText: '', now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result.state;
}

describe('single diagnostic action', () => {
  it('shows one LMULM action after the outside-customer path and leaves the engine paragraph intact', () => {
    const text = `${LMULM_PLAN_FIXTURE}${S3_TO_S6}`;
    const outside = answer(answer(answer(started(text), 'parent'), 'required'), 'none');
    const engine = verificationActionFor(outside);
    const shown = presentSingleDiagnosticAction(outside);
    const assumptions = outside.planCase?.claims.filter((item) => item.claimStatus === 'ASSUMPTION') ?? [];

    expect(outside.nextQuestion).toBeNull();
    expect(engine.action).toContain('주문 원장에서 모회사·납품');
    expect(engine.action).toContain('재구매율을 추정하지 않는다');
    expect(engine.action).toContain('모회사 채널 밖 고객 확보 기록을 찾는다');
    expect(shown.engineBlockCount).toBe(3);
    expect(shown.action).toBe(
      '주문 원장에서 모회사·납품 매출과 일반 소비자 매출을 나눈다. 2,000만 회원은 모회사 회원수다.',
    );
    expect(shown.action).not.toContain('재구매');
    expect(shown.action).not.toContain('모회사 채널 밖');
    expect(shown.successCriterion).toContain('주문 원장');
    expect(shown.successCriterion).not.toContain('재구매');
    expect(shown.successCriterion).not.toContain('독립 채널');
    expect(assumptions).toHaveLength(4);
    expect(outside.hypothesisJudgments.every((item) => item.verifiedFact === false)).toBe(true);
    expect(outside.judgmentStatus).toBe('judgment_deferred');

    const document = renderVerificationDocument(outside);
    expect(document).toContain(shown.action);
    expect(document).toContain(`성공 기준: ${shown.successCriterion}`);
    expect(document).not.toContain('재구매율을 추정하지 않는다');
    expect(document).not.toContain('신호등');
    expect(document).not.toContain('리스크');
  });

  it('shows the first payment record for RIDM and withholds the cost measurement line', () => {
    const done = answer(answer(started(RIDM_PLAN_FIXTURE), 'none'), 'not_yet');
    const engine = verificationActionFor(done);
    const shown = presentSingleDiagnosticAction(done);

    expect(done.nextQuestion).toBeNull();
    expect(engine.action).toContain('최초 유료 고객 1명');
    expect(engine.action).toContain('사용량');
    expect(shown.engineBlockCount).toBe(2);
    expect(shown.action).toBe(
      '최초 유료 고객 1명의 결제 원문을 가져온다. 전환율 가정은 실적으로 세지 않는다.',
    );
    expect(shown.action).not.toContain('사용량');
    expect(shown.successCriterion).toContain('결제 원문');
    expect(shown.successCriterion).not.toContain('인프라 비용');
    expect(done.hypothesisJudgments.every((item) => item.verifiedFact === false)).toBe(true);
  });

  it('keeps the open question as the only action before the plan paragraph is reached', () => {
    const parent = answer(started(LMULM_PLAN_FIXTURE), 'parent');
    const shown = presentSingleDiagnosticAction(parent);

    expect(parent.nextQuestion?.uncertaintyId).toBe('u-lmulm-independence');
    expect(shown.engineBlockCount).toBe(1);
    expect(shown.action).toBe(parent.nextQuestion?.prompt);
    expect(shown.action).not.toContain('재구매');
    expect(shown.successCriterion).toContain('검증된 사실이 아니다');
  });
});
