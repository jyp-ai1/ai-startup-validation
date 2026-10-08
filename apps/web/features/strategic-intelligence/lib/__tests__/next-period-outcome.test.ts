import { describe, expect, it } from 'vitest';

import { isNextPeriodHeldText, isNextPeriodPlannedText } from '../next-period-outcome';

describe('next-period outcome meaning', () => {
  it('keeps a measurement plan distinct from a held result', () => {
    expect(isNextPeriodPlannedText('다음 기간 성과를 측정할 예정이다.')).toBe(true);
    expect(isNextPeriodPlannedText('다음 고객에서 같은 지표를 확인할 예정이다.')).toBe(true);
    expect(isNextPeriodHeldText('다음 기간 성과를 측정할 예정이다.')).toBe(false);
  });

  it('recognizes a held next-period or next-customer outcome', () => {
    expect(
      isNextPeriodHeldText(
        '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
      ),
    ).toBe(true);
    expect(isNextPeriodHeldText('다음 달에도 반품률이 20%로 유지됐다.')).toBe(true);
    expect(isNextPeriodPlannedText('다음 달에도 반품률이 20%로 유지됐다.')).toBe(false);
  });

  it('does not treat the first 2/2 or a worse period as held', () => {
    expect(
      isNextPeriodHeldText('결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.'),
    ).toBe(false);
    expect(isNextPeriodHeldText('다음 기간에 누락이 6%에서 18%로 늘었다.')).toBe(false);
  });
});
