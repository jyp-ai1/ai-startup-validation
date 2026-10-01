import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';

const CORE = `사업명: 클리닉플로우
고객: 5~30인 피부·치과 원장
문제: no-show 15~25%
수익: 병원 월 구독 SaaS`;

function padDocument(targetChars: number): string {
  const filler = '\n\n[배경] '.repeat(Math.ceil(targetChars / 8));
  return `${CORE}${filler}`.slice(0, targetChars);
}

describe('Track F — semantic parity across input lengths', () => {
  const lengths = [500, 1000, 3000, 5000];

  for (const len of lengths) {
    it(`${len} chars preserves customer and problem signals`, () => {
      const doc = padDocument(len);
      expect(doc.length).toBeGreaterThanOrEqual(Math.min(len, CORE.length + 50));
      const entities = extractDocumentEntities(doc);
      expect(entities.customer.value ?? '').toContain('피부');
      expect(entities.product.value ?? '').toContain('no-show');
    });
  }
});
