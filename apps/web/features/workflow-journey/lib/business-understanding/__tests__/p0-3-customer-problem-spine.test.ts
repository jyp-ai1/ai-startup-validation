import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '../../domain/extract-document-entities';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildSharedUnderstanding } from '../build-shared-understanding';

describe('P0-3C customer / problem spine', () => {
  it('P0-2B — 대상: 소규모 양조장 maps to customer', () => {
    const doc = `# SaaS\n\n대상: 소규모 양조장`;
    const entities = extractDocumentEntities(doc);
    expect(entities.customer.value).toMatch(/양조장/);
    expect(entities.customer.basis).toBe('document');
  });

  it('CEO scenario — labeled 고객 and 문제 appear in shared understanding', () => {
    const documentText = [
      '사업명: 소상공인 매장 홍보 자동화',
      '고객: 지역 소상공인',
      '문제: 온라인 홍보 시간과 전문성 부족',
    ].join('\n');

    const understanding = buildBusinessUnderstanding(documentText);
    expect(understanding.customer.value).toMatch(/소상공인/);
    expect(understanding.problem.value).toMatch(/홍보/);

    const shared = buildSharedUnderstanding({
      documentText,
      turns: [],
      understanding,
      entities: extractDocumentEntities(documentText),
    });

    expect(shared?.customer).toMatch(/소상공인/);
    expect(shared?.problem).toMatch(/홍보/);
  });
});
