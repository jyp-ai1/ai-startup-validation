import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  extractQuantities,
  hasCountedCompletion,
  hasCountedPaidConversion,
  type QuantityKind,
} from '../quantity-unit';

const SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../quantity-unit.ts'),
  'utf8',
);

function kindsOf(text: string): QuantityKind[] {
  return extractQuantities(text).map((item) => item.kind);
}

describe('quantity-unit — meaning-preserving counts', () => {
  it('does not brand-branch or collapse every unit into 건', () => {
    expect(SRC).not.toMatch(/주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i);
    expect(SRC).not.toMatch(/replace\([^)]*곳[^)]*건/);
    expect(SRC).toMatch(/customer_org/);
    expect(SRC).toMatch(/transaction/);
    expect(SRC).toMatch(/contract/);
  });

  it('keeps 곳 / 명 / 건 / 계약 / 개 병원 as distinct kinds', () => {
    expect(kindsOf('결제 후보 2곳이 결제했다')).toEqual(['customer_org']);
    expect(kindsOf('결제 후보 3명이 결제했다')).toEqual(['person']);
    expect(kindsOf('유료 전환 2건이 발생했다')).toEqual(['transaction']);
    expect(kindsOf('2계약이 결제됐다')).toEqual(['contract']);
    expect(kindsOf('병원 5개가 결제했다')).toEqual(['customer_org']);
    expect(kindsOf('5개 병원이 결제했다')).toEqual(['customer_org']);
  });

  it('treats org/transaction payers as paid conversion without rewriting 곳 to 건', () => {
    expect(hasCountedPaidConversion('결제 후보 2곳이 월 구독을 결제했고 no-show가 줄었다.')).toBe(
      true,
    );
    expect(hasCountedPaidConversion('결제 후보 2곳이 위젯을 결제했고 반품률이 줄었다.')).toBe(true);
    expect(hasCountedPaidConversion('결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했다.')).toBe(
      true,
    );
    expect(hasCountedPaidConversion('5개 병원이 월 구독을 결제했다.')).toBe(true);
    expect(hasCountedPaidConversion('2계약이 월 구독을 결제했다.')).toBe(true);
  });

  it('does not treat user-count or unpaid mentions as paid conversion', () => {
    expect(hasCountedPaidConversion('간호사 2명이 사용했다.')).toBe(false);
    expect(hasCountedPaidConversion('브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.')).toBe(
      false,
    );
    expect(hasCountedPaidConversion('유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.')).toBe(
      false,
    );
    expect(hasCountedPaidConversion('결제할 예정이다.')).toBe(false);
    expect(hasCountedPaidConversion('검토 중이다.')).toBe(false);
    expect(hasCountedPaidConversion('0곳이 결제했다.')).toBe(false);
    expect(hasCountedPaidConversion('0건이 결제됐다.')).toBe(false);
  });

  it('keeps resale completion on person/transaction counts, not org payment', () => {
    expect(
      hasCountedCompletion('최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.'),
    ).toBe(true);
    expect(hasCountedCompletion('결제 후보 2곳이 월 구독을 결제했다.')).toBe(false);
    expect(hasCountedCompletion('재구매 2건은 있었으나 재판매 등록은 0건이다.')).toBe(false);
  });
});
