import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';

const OFFICIAL_REPEAT = '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';
const TRADE_COUNT_ONLY = '이번 달에 현장에서 12건이 거래됐다.';
const ON_AXIS_RENEWAL = '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했다.';

const PARTICLE_LESS = `수도권 냉동탑차 30대를 운용하는 3PL은 종이 온도기록지로 관리해서 하절기 온도 초과 주 14건입니다.
기존 대안은 종이 온도기록지와 기사 수기 보고입니다.
아직 출시되지 않았고 매출은 없습니다.
결제자는 물류사 운영팀장입니다.`;

const METRIC_LESS_AGENCY = `지역 카페 사장님에게 주간 메뉴 사진을 대신 올리는 대행이다.
사장님은 홍보할 시간이 부족하다.
기존 대안은 사장이 직접 인스타그램에 올리는 것이다.
아직 출시되지 않았고 매출은 없다.`;

function judge(document: string, answer?: string) {
  return analyzeStrategicIntelligence({
    documentText: answer ? appendFounderEvidenceToDocument(document, answer) : document,
  });
}

describe('P1 accuracy — particle-less metrics and metric-less S4', () => {
  it('P1-A: current-harm quantities without 가/이 still open the metric CU', () => {
    const t0 = judge(PARTICLE_LESS);
    expect(t0.criticalUnknown).toMatch(/초과|온도/);
    expect(t0.verdictId).toBe('judgment_deferred');
    expect(t0.stageId).not.toMatch(/S3|S4/);

    const paid = judge(PARTICLE_LESS, '물류사 2곳이 월 구독을 결제했다.');
    expect(paid.stageId).not.toBe('S3');
    expect(paid.stageId).not.toBe('S4');
    expect(paid.verdictId).toBe('judgment_deferred');
    expect(paid.criticalUnknown).toMatch(/초과|온도/);
    expect(paid.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED' || /결제/.test(item.text))).toBe(
      true,
    );
  });

  it('P1-A: a bare market or job tally is not treated as a validated outcome', () => {
    const market = judge(
      `홍보 대행이다. 글로벌 시장 2025년 $78억 전망 (CAGR 46.3%).
아직 출시되지 않았고 매출은 없다.`,
    );
    expect(market.criticalUnknown).not.toMatch(/CAGR|시장 규모|78/);
    expect(market.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(true);

    const jobs = judge(METRIC_LESS_AGENCY, '현장 작업을 12건 등록했다.');
    expect(jobs.stageId).not.toBe('S4');
    expect(jobs.verdictId).not.toBe('viable');
    expect(jobs.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(true);
  });

  it('P1-B: official resale repeat_loop does not S4 a metric-less non-resale business', () => {
    const drifted = judge(METRIC_LESS_AGENCY, OFFICIAL_REPEAT);
    expect(drifted.stageId === 'S4' && drifted.verdictId === 'viable').toBe(false);
    expect(drifted.judgment).not.toMatch(/사업화 가능성이 높음/);

    const trades = judge(METRIC_LESS_AGENCY, TRADE_COUNT_ONLY);
    expect(trades.stageId).not.toBe('S4');
    expect(trades.verdictId).not.toBe('viable');

    const juinjip = getSiCalibrationCase('juinjip');
    const paidThenResale = judge(
      appendFounderEvidenceToDocument(
        juinjip.documentText,
        '결제자 5명이 실제로 월 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
      ),
      OFFICIAL_REPEAT,
    );
    expect(paidThenResale.stageId === 'S4' && paidThenResale.verdictId === 'viable').toBe(false);
    expect(paidThenResale.criticalUnknown).toMatch(/세그먼트|결제|관광|반복/);
  });

  it('P1-B: C2C resale thesis still reaches S4 on counted resale, not on raw trades', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const closed = judge(lmulm.documentText, OFFICIAL_REPEAT);
    expect(closed.stageId).toBe('S4');
    expect(closed.verdictId).toBe('viable');

    const raw = judge(lmulm.documentText, TRADE_COUNT_ONLY);
    expect(raw.stageId).toBe('S3');
    expect(raw.criticalUnknown).toMatch(/재판매|C2C|반복/);
  });

  it('P1-B: on-axis renewal can still close repeat when the count is a second payment', () => {
    const launched = `카페 사장님에게 주간 메뉴 사진을 대신 올리는 구독 대행이다.
자체 앱을 출시했다.
사장님 2곳이 월 구독을 결제했고 매출이 있다.`;
    const renewed = judge(launched, ON_AXIS_RENEWAL);
    expect(renewed.stageId).toBe('S4');
    expect(renewed.verdictId).toBe('viable');
  });
});
