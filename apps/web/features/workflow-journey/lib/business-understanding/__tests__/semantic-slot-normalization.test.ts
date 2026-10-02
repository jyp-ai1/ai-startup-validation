import { describe, expect, it } from 'vitest';

import {
  hasValidationEvidenceCue,
  isUserAssumptionUtterance,
  isWtpHypothesisOnly,
  normalizeSlotValue,
  valuesAreDistinctAcrossKeys,
} from '../semantic-slot-normalization';

describe('semantic-slot-normalization (CPO 2-pass fixes)', () => {
  it('splits A-1 customer vs problem clauses', () => {
    const u =
      '우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다.';
    expect(normalizeSlotValue('customer', u)).toMatch(/음식점.*사장/);
    expect(normalizeSlotValue('problem', u)).toMatch(/SNS|홍보/);
    expect(valuesAreDistinctAcrossKeys({
      customer: normalizeSlotValue('customer', u)!,
      problem: normalizeSlotValue('problem', u)!,
    })).toBe(true);
  });

  it('splits F-1 multi-slot utterance', () => {
    const u =
      '고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 10만원입니다.';
    expect(normalizeSlotValue('customer', u)).toMatch(/양조장/);
    expect(normalizeSlotValue('problem', u)).toMatch(/홍보/);
    expect(normalizeSlotValue('revenue', u)).toMatch(/10/);
  });

  it('detects WTP hypothesis', () => {
    expect(isWtpHypothesisOnly('아마 고객들이 이 서비스에 돈을 낼 것 같아요.')).toBe(true);
    expect(isUserAssumptionUtterance('아마 고객들이 이 서비스에 돈을 낼 것 같아요.')).toBe(true);
  });

  it('F04 — validation evidence vs assumption hedge', () => {
    expect(
      hasValidationEvidenceCue('실제 고객 20곳에 인터뷰했고 15곳이 월 10만원 결제 의향을 밝혔습니다.'),
    ).toBe(true);
    expect(isUserAssumptionUtterance('중소기업 고객이 월 10만원을 낼 것 같습니다.')).toBe(true);
    expect(hasValidationEvidenceCue('중소기업 고객이 월 10만원을 낼 것 같습니다.')).toBe(false);
  });

  it('C-1 — splits revenue vs competitor', () => {
    const u = '현재 월 매출은 3천만원이고 경쟁사는 배달앱입니다.';
    expect(normalizeSlotValue('revenue', u)).toMatch(/3천/);
    expect(normalizeSlotValue('revenue', u)).not.toMatch(/배달/);
    expect(normalizeSlotValue('competitor', u)).toMatch(/배달/);
  });
});
