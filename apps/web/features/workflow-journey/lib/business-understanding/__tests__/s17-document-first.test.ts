import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  buildDocumentFirstDraft,
  seedDomainFromDocumentFirstDraft,
} from '../build-document-first-draft';
import { SHARED_UNDERSTANDING_PENDING } from '../build-shared-understanding';
import { PDF_PLACEHOLDER_TEXT } from '../../first-trust';

const RICH_DOC = `# 취향저격컴퍼니

창업자: 김대표 (예비창업자)
사업: B2C 여행 취향 큐레이션 서비스
고객: 20–30대 개인 여행자
문제: 여행지 선택이 어렵고 취향에 맞지 않는 추천이 많음
시장: 국내 여행 큐레이션
경쟁: 유사 큐레이션 앱
`;

describe('S17-1 Document First draft', () => {
  it('builds draft with business/customer/problem and confidence after readable doc', () => {
    const understanding = buildBusinessUnderstanding(RICH_DOC);
    const draft = buildDocumentFirstDraft({
      documentText: RICH_DOC,
      understanding,
    });

    expect(draft).not.toBeNull();
    expect(draft!.fields.map((f) => f.id)).toEqual([
      'business',
      'customer',
      'problem',
      'market',
      'competitor',
    ]);
    expect(draft!.spine.business).not.toBe(SHARED_UNDERSTANDING_PENDING);
    expect(draft!.confidencePercent).toBeGreaterThan(0);
    expect(draft!.documentReadable).toBe(true);
    expect(['document', 'mixed', 'inferred']).toContain(draft!.confidenceMode);
  });

  it('keeps honest unknown draft for PDF placeholder (no empty-form contract)', () => {
    const understanding = buildBusinessUnderstanding(PDF_PLACEHOLDER_TEXT);
    const draft = buildDocumentFirstDraft({
      documentText: PDF_PLACEHOLDER_TEXT,
      understanding,
    });

    expect(draft).not.toBeNull();
    expect(draft!.documentReadable).toBe(false);
    expect(draft!.confidencePercent).toBeLessThanOrEqual(42);
    expect(draft!.fields.length).toBe(5);
    // Always returns field rows — never null/empty form
    expect(draft!.fields.every((f) => typeof f.value === 'string')).toBe(true);
  });

  it('seeds domain from draft so edit path is not blank', () => {
    const understanding = buildBusinessUnderstanding(RICH_DOC);
    const draft = buildDocumentFirstDraft({
      documentText: RICH_DOC,
      understanding,
    })!;

    const seeded = seedDomainFromDocumentFirstDraft(draft, {
      founder: '',
      business: '',
      customer: '',
      market: '',
      competitor: '',
    });

    expect(seeded.business.length).toBeGreaterThan(0);
  });
});
