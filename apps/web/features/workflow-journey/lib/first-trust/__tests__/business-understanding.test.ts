import { describe, expect, it } from 'vitest';

import {
  buildBusinessUnderstanding,
  TASTE_COMPANY_FULL_SAMPLE,
} from '../../business-understanding/build-business-understanding';

describe('business-understanding/taste-company', () => {
  it('separates founder, partner, and customer mentions', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);

    expect(u.founder.value).toContain('관광');
    expect(u.founder.confirmedExpressions).toContain('관광벤처 예비창업자');
    expect(u.business.confirmedExpressions).toEqual(
      expect.arrayContaining(['AI 기반 전통주 관광 플랫폼', 'B2C']),
    );
    expect(u.revenue.confirmedExpressions).toEqual(
      expect.arrayContaining(['양조장 제휴', '데이터 리포트']),
    );
    expect(u.partner.confirmedExpressions?.[0]).toMatch(/양조장/);
    expect(u.customer.value).toBeNull();
    expect(u.customer.status).toBe('needs_confirmation');
    expect(u.customerMentions.length).toBeGreaterThanOrEqual(2);
    expect(u.customer.missingLine).toMatch(/결제/);
    expect(u.customer.nextStep).toMatch(/같이 확인/);
    expect(u.customerMentions.some((m) => m.quote === '외국인')).toBe(true);
  });

  it('never maps founder archetype to customer', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    const mentions = u.customerMentions.map((m) => m.label).join(' ');
    expect(mentions).not.toContain('예비창업');
    expect(u.customer.value).not.toBe('예비창업자');
  });

  it('does not assert customer when document has multiple segments', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    expect(u.customer.value).toBeNull();
    expect(u.customer.confirmedExpressions?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('business-understanding/revenue', () => {
  it('extracts revenue without calling it customer', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    expect(u.revenue.value).toMatch(/양조장|데이터/);
    expect(u.revenue.confirmedExpressions?.length).toBeGreaterThan(0);
  });
});

describe('business-understanding/rank1-withhold', () => {
  it('withholds customer without verbose reasoning when no customer section exists', () => {
    const u = buildBusinessUnderstanding('취향저격컴퍼니\n관광벤처 예비창업자\nAI 기반 전통주 관광 플랫폼');
    expect(u.customer.value).toBeNull();
    expect(u.customer.missingLine).toMatch(/고객/);
    expect(u.customer.nextStep).toBeTruthy();
    expect(u.customer.reasoning).toBeFalsy();
  });
});
