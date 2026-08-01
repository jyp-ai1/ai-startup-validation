import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildAiPmDynamicDiagnosis } from '../build-ai-pm-dynamic-diagnosis';
import { extractDocumentEntities } from '../../domain/extract-document-entities';

export const P1_3_CASE_DOCUMENTS = {
  A: `스마트팩토리 예지보전 SaaS
창업자: 김대표
사업: 30인 이하 제조기업 대상 설비 고장 예측
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`,
  B: `스마트팩토리 예지보전 SaaS
창업자: 김대표
고객: 30인 이하 제조기업 설비 관리자
문제: 예기치 않은 설비 고장으로 생산 중단
BM: 월 49만 원 구독 · 공장당 10대 센서 포함`,
  C: `스마트팩토리 예지보전 SaaS
창업자: 김대표
고객: 30인 이하 제조기업 설비 관리자
문제: 예기치 않은 설비 고장으로 생산 중단
시장: 국내 3만 개 중소 제조 공장 · 예지보전 SW 침투율 8%`,
} as const;

const EXPECTED = {
  A: { primaryIssueId: 'customer_definition' },
  B: { primaryIssueId: 'market_validation' },
  C: { primaryIssueId: 'bm_design' },
} as const;

function diagnoseCase(caseId: keyof typeof P1_3_CASE_DOCUMENTS) {
  const documentText = P1_3_CASE_DOCUMENTS[caseId];
  const understanding = buildBusinessUnderstanding(documentText);
  const entities = extractDocumentEntities(documentText);
  const diagnosis = buildAiPmDynamicDiagnosis(understanding, entities, documentText);
  return { caseId, documentText, diagnosis };
}

describe('buildAiPmDynamicDiagnosis — Sprint P1-3', () => {
  it('Case A — weak customer → Risk #1 customer', () => {
    const { diagnosis } = diagnoseCase('A');
    expect(diagnosis.primaryIssueId).toBe('customer_definition');
    expect(diagnosis.topRiskIssueIds[0]).toBe('customer_definition');
  });

  it('Case B — weak market → Risk #1 market', () => {
    const { diagnosis } = diagnoseCase('B');
    expect(diagnosis.primaryIssueId).toBe('market_validation');
    expect(diagnosis.topRiskIssueIds[0]).toBe('market_validation');
  });

  it('Case C — weak BM → Risk #1 revenue model', () => {
    const { diagnosis } = diagnoseCase('C');
    expect(diagnosis.primaryIssueId).toBe('bm_design');
    expect(diagnosis.topRiskIssueIds[0]).toBe('bm_design');
  });

  it('Risk scores differ across documents', () => {
    const a = diagnoseCase('A').diagnosis.riskScores;
    const b = diagnoseCase('B').diagnosis.riskScores;
    expect(a.find((item) => item.issueId === 'customer_definition')?.score).toBeGreaterThan(
      b.find((item) => item.issueId === 'customer_definition')?.score ?? 0,
    );
  });

  it('writes diagnosis-result.json when P1_3_EVIDENCE=1', () => {
    if (process.env.P1_3_EVIDENCE !== '1') return;

    const cases = (['A', 'B', 'C'] as const).map((caseId) => {
      const result = diagnoseCase(caseId);
      return {
        caseId,
        primaryIssueId: result.diagnosis.primaryIssueId,
        expectedPrimaryIssueId: EXPECTED[caseId].primaryIssueId,
        firstQuestionKey: result.diagnosis.firstQuestion?.questionKey ?? null,
        confidencePercent: result.diagnosis.confidencePercent,
        confidenceRationale: result.diagnosis.confidenceRationale,
        riskScores: result.diagnosis.riskScores.map((item) => ({
          issueId: item.issueId,
          label: item.label,
          score: item.score,
          rationale: item.rationale,
          documentSignal: item.documentSignal,
        })),
      };
    });

    const outDir = join(process.cwd(), '..', '..', 'docs', 'evidence', 'SPRINT-P1-3');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, 'diagnosis-result.json'),
      `${JSON.stringify({ generatedAt: new Date().toISOString(), cases }, null, 2)}\n`,
    );
  });
});
