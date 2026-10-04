/**
 * Phase 2-D D1 HOLD — Production can store the unreadable placeholder as a living
 * claim. That is not a short-sandbox artifact. D2 already stops the question leak.
 * Do not patch claim storage in this sprint.
 */
import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { SHARED_UNDERSTANDING_UNREADABLE_BUSINESS } from '../build-shared-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { reframeQuestion } from '../reframe-question';
import {
  getWorkspaceDocumentTrust,
  isWorkspaceDocumentAnalyzable,
  isWorkspaceDocumentReadable,
} from '../workspace-document-eligibility';

const PDF_PLACEHOLDER = `# plan.pdf

PDF 본문은 아직 추출되지 않았습니다. Business·Customer는 직접 확인이 필요합니다.`;

describe('Phase 2-D D1 — Production unreadable document (HOLD)', () => {
  it('a failed PDF extract is analyzable, unreadable, and Production offers continue', () => {
    expect(isWorkspaceDocumentAnalyzable(PDF_PLACEHOLDER)).toBe(true);
    expect(isWorkspaceDocumentReadable(PDF_PLACEHOLDER)).toBe(false);
    expect(getWorkspaceDocumentTrust(PDF_PLACEHOLDER)).toMatchObject({
      status: 'unreadable',
      kind: 'pdf',
    });
  });

  it('the living business claim may be the placeholder (AI PM storage — not patched)', () => {
    const living = buildLivingUnderstandingState({
      documentText: PDF_PLACEHOLDER,
      understanding: buildBusinessUnderstanding(PDF_PLACEHOLDER),
    });
    const business = living.claims.find((c) => c.fieldKey === 'businessOneLiner')?.value;
    expect(business).toBe(SHARED_UNDERSTANDING_UNREADABLE_BUSINESS);
  });

  it('D2: the next question does not quote that placeholder', () => {
    const q = reframeQuestion({
      targetGap: 'alternativesCompetitors',
      living: {
        claims: [
          {
            fieldKey: 'businessOneLiner',
            value: SHARED_UNDERSTANDING_UNREADABLE_BUSINESS,
            status: 'stated',
          },
        ],
        judgmentSummary: SHARED_UNDERSTANDING_UNREADABLE_BUSINESS,
      } as Parameters<typeof reframeQuestion>[0]['living'],
      reason: 'adaptive',
    });
    expect(q.questionText).not.toMatch(/아직 문서에서 사업 내용을 충분히/);
  });
});
