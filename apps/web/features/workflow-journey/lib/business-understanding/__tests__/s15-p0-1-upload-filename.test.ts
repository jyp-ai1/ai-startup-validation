import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '../../domain/extract-document-entities';
import { looksLikeDocumentFileName } from '../workspace-document-eligibility';
import { analyzeSmartIntakeDocument } from '../../v2-smart-intake-engine';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

describe('S15 P0-1 — upload filename must never become business name', () => {
  it('rejects plan.pdf / PDF placeholder as looksLikeDocumentFileName', () => {
    expect(looksLikeDocumentFileName('plan.pdf')).toBe(true);
    expect(looksLikeDocumentFileName(PDF_PLACEHOLDER)).toBe(true);
  });

  it('extractDocumentEntities does not set business name to filename', () => {
    const entities = extractDocumentEntities(PDF_PLACEHOLDER);
    expect(entities.business.name).toBeNull();
    expect(entities.business.value).toBeNull();
  });

  it('smart intake analysis uses fallback name, not plan.pdf', () => {
    const analysis = analyzeSmartIntakeDocument(PDF_PLACEHOLDER, 'pdf');
    expect(analysis.serviceName).toBe('내 프로젝트');
    expect(looksLikeDocumentFileName(analysis.serviceName)).toBe(false);
  });
});
