import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';

describe('LS-2 slot accuracy — labeled customer lines', () => {
  it('accepts explicit 고객: line with middle-dot segments', () => {
    const text = `사업명: 클리닉플로우
고객: 5~30인 피부·치과 원장
문제: no-show 15~25%`;
    const { customer } = extractDocumentEntities(text);
    expect(customer.basis).toBe('document');
    expect(customer.value).toContain('피부');
    expect(customer.value).toContain('치과');
  });

  it('does not invent customer when no customer line exists', () => {
    const text = '사업명: 테스트\n문제: 운영 비용';
    const { customer } = extractDocumentEntities(text);
    expect(customer.value).toBeNull();
  });
});
