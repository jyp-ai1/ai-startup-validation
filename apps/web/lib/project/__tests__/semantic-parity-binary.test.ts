import { describe, expect, it } from 'vitest';

import { extractDocumentEntities } from '@/features/workflow-journey/lib/domain/extract-document-entities';
import { analyzeSmartIntakeDocument } from '@/features/workflow-journey/lib/v2-smart-intake-engine';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const DOCX_PLACEHOLDER = `# pitch.docx

Word 사업계획서를 불러왔습니다. 본문은 Workspace Trust Block에서 함께 확인합니다.`;

const PASTE_CORE = `사업명: 클리닉플로우
고객: 5~30인 피부·치과 원장
문제: no-show 15~25%
수익: 병원 월 구독`;

describe('Track F — PDF/DOCX placeholder vs paste semantic parity', () => {
  it('PDF placeholder intake does not use filename as service name', () => {
    const analysis = analyzeSmartIntakeDocument(PDF_PLACEHOLDER, 'pdf');
    expect(analysis.serviceName).toBe('내 프로젝트');
    expect(analysis.serviceName).not.toMatch(/\.pdf/i);
  });

  it('DOCX placeholder intake keeps unknown entities until Trust Block', () => {
    const analysis = analyzeSmartIntakeDocument(DOCX_PLACEHOLDER, 'docx');
    expect(analysis.serviceName).toBe('내 프로젝트');
    expect(analysis.entities.customer.value).toBeNull();
  });

  it('paste path extracts same customer/problem as padded long paste', () => {
    const shortEntities = extractDocumentEntities(PASTE_CORE);
    const padded = `${PASTE_CORE}\n\n${'배경 설명 '.repeat(200)}`;
    const longEntities = extractDocumentEntities(padded);
    expect(shortEntities.customer.value ?? '').toContain('피부');
    expect(longEntities.customer.value).toBe(shortEntities.customer.value);
    expect(longEntities.product.value ?? '').toContain('no-show');
  });
});
