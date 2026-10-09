import { describe, expect, it } from 'vitest';

import {
  extractProblemMetric,
  isOffAxisResaleCompletion,
  isProblemMetricImproved,
  isProblemMetricWorsened,
} from '../si-problem-metric';

describe('si-problem-metric — document token, not an allowlist', () => {
  it('reads unseen and known metrics next to a quantity', () => {
    expect(extractProblemMetric('하절기 온도 초과가 주 14건입니다.')).toBe('온도 초과');
    expect(extractProblemMetric('보철 재작업이 월 19%입니다.')).toMatch(/재작업/);
    expect(extractProblemMetric('굴착기 공회가 42%입니다.')).toMatch(/공회/);
    expect(extractProblemMetric('급유 지연이 출항 건당 18%입니다.')).toBe('급유 지연');
    expect(extractProblemMetric('치수 불량이 22%입니다.')).toBe('치수 불량');
    expect(extractProblemMetric('잔반이 1인당 28%입니다.')).toBe('잔반');
    expect(extractProblemMetric('스크리닝 방문 노쇼가 31%입니다.')).toMatch(/노쇼/);
    expect(extractProblemMetric('송금 불일치가 건당 16%입니다.')).toMatch(/불일치/);
    expect(extractProblemMetric('no-show가 18%에 달합니다.')).toMatch(/no-show/i);
  });

  it('does not treat payment-only, forecast, or target KPI as a problem metric', () => {
    expect(extractProblemMetric('물류사 2곳이 월 구독을 결제했다.')).toBeNull();
    expect(extractProblemMetric('결제 후보 2명이 월 구독을 결제했다.')).toBeNull();
    expect(extractProblemMetric('유료 전환 1건이 발생했다.')).toBeNull();
    expect(extractProblemMetric('글로벌 AI 에이전트 시장 2025년 $78억 → 2030년 $526억 전망 (CAGR 46.3%)')).toBeNull();
    expect(extractProblemMetric('사장 주 2시간 홍보 → 10분으로 줄이면 유지율 80% 이상.')).toBeNull();
    expect(extractProblemMetric('최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.')).toBeNull();
  });

  it('detects improve and worsen on the extracted token', () => {
    expect(isProblemMetricImproved('온도 초과가 주 14건에서 4건으로 줄었다.')).toBe(true);
    expect(isProblemMetricWorsened('온도 초과가 4건에서 13건으로 늘었다.')).toBe(true);
    expect(isProblemMetricWorsened('노쇼가 12%에서 29%로 늘었다.')).toBe(true);
  });

  it('names off-axis resale completion', () => {
    expect(
      isOffAxisResaleCompletion('최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.'),
    ).toBe(true);
    expect(isOffAxisResaleCompletion('이미 결제한 고객 중 2명이 다음 달에도 다시 결제했다.')).toBe(false);
  });
});
