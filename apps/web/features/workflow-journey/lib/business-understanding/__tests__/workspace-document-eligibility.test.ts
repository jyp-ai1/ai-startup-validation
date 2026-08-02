import { describe, expect, it } from 'vitest';

import {
  getWorkspaceDocumentTrust,
  isWorkspaceDocumentAnalyzable,
  isWorkspaceDocumentReadable,
} from '../workspace-document-eligibility';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

const REAL_DOC = `# AI SaaS

문제: 중소 제조 공장은 설비 고장을 엑셀로 관리합니다.
고객: 30인 이하 제조기업
시장: 국내 중소 제조
사업모델: 월 구독 SaaS`;

describe('workspace-document-eligibility — S7-1 Trust Contract', () => {
  it('treats PDF placeholder as analyzable but not readable', () => {
    expect(isWorkspaceDocumentAnalyzable(PDF_PLACEHOLDER)).toBe(true);
    expect(isWorkspaceDocumentReadable(PDF_PLACEHOLDER)).toBe(false);
    expect(getWorkspaceDocumentTrust(PDF_PLACEHOLDER)).toEqual({
      status: 'unreadable',
      kind: 'pdf',
      fileName: 'plan.pdf',
    });
  });

  it('treats real pasted document as readable', () => {
    expect(isWorkspaceDocumentReadable(REAL_DOC)).toBe(true);
    expect(getWorkspaceDocumentTrust(REAL_DOC)).toEqual({ status: 'readable' });
  });
});
