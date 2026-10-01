import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';
import { isSmartPmSampleDocument } from '@/features/workflow-journey/lib/demo-guided-document-hydration';

const CEO_DOC = `사업명: 동네장터알림
고객: 직원 5명 이하 F&B 사장
문제: SNS 홍보 시간 부족
수익: 월 9.9만 원 구독`;

describe('LS-2 Phase 1 — grounding firewall', () => {
  it('does not treat CEO doc as legacy SmartPM preset', () => {
    expect(isSmartPmSampleDocument(CEO_DOC)).toBe(false);
  });

  it('extracts customer/problem from CEO doc without SmartPM literals', () => {
    const entities = extractDocumentEntities(CEO_DOC);
    const blob = JSON.stringify(entities);
    expect(blob).not.toContain('스마트PM');
    expect(entities.customer.value).toMatch(/F&B|사장/);
    expect(entities.product.value ?? entities.business.value).toBeTruthy();
  });
});
