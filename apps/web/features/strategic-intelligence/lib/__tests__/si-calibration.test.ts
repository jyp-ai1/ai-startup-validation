import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence, judgmentContainsScore } from '../analyze-strategic-intelligence';
import { getSiCalibrationCase } from '../si-calibration-cases';

function analyzeCase(id: Parameters<typeof getSiCalibrationCase>[0]) {
  const fixture = getSiCalibrationCase(id);
  return analyzeStrategicIntelligence({
    title: fixture.title,
    documentText: fixture.documentText,
  });
}

describe('S.I. V1 calibration — 주인집 / LMULM / RIDM AI', () => {
  it('주인집: 실행 전 단계이므로 판단을 보류하고 결제자·세그먼트를 미검증으로 둔다', () => {
    const judgment = analyzeCase('juinjip');

    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
    expect(judgment.verdictId).toBe('judgment_deferred');
    expect(['S0', 'S1', 'S2']).toContain(judgment.stageId);
    expect(judgment.judgment).toMatch(/보류/);
    expect(judgment.criticalUnknown).toMatch(/결제|돈|세그먼트|지불|구매자/);
    expect(judgment.decisionChangingEvidence).toMatch(/지불|결제|인터뷰|실사용/);
    expect(judgment.validationPriority).toMatch(/결제|세그먼트|지불|사용자/);
    expect(judgment.whyFail).toMatch(/결제|세그먼트|매출|출시|가설/);
    expect(judgment.evidenceMap.some((item) => item.evidenceClass === 'FACT')).toBe(true);
    expect(
      judgment.evidenceMap.some(
        (item) => item.evidenceClass === 'CLAIM' || item.evidenceClass === 'ASSUMPTION',
      ),
    ).toBe(true);
    expect(judgment.evidenceMap.some((item) => /MZ|FIT|타깃/.test(item.text))).toBe(true);
  });

  it('LMULM: 매출·출시·공급이 있으면 사업화 가능성부터 말하고, 재판매 반복을 판단을 바꿀 증거로 둔다', () => {
    const judgment = analyzeCase('lmulm');

    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
    expect(judgment.verdictId).toBe('viable');
    expect(judgment.stageId).toBe('S3');
    expect(judgment.judgment).toMatch(/사업화 가능성이 높음/);
    expect(judgment.whyPossible).toMatch(/매출|판매|공급|출시|구매/);
    expect(judgment.whyFail).toMatch(/재판매|C2C|반복/);
    expect(judgment.criticalUnknown).toMatch(/재판매|C2C|반복/);
    expect(judgment.decisionChangingEvidence).toMatch(/재판매|재구매|거래/);
    expect(judgment.validationPriority).toMatch(/재판매|재구매|코호트/);
    expect(judgment.strengths.join(' ')).toMatch(/판매|매출|공급|출시/);
    expect(judgment.risks.join(' ')).toMatch(/재판매|C2C/);
    expect(judgment.evidenceMap.some((item) => item.evidenceClass === 'FACT')).toBe(true);
    expect(judgment.evidenceMap.some((item) => item.evidenceClass === 'INFERENCE')).toBe(true);
    expect(judgment.axes.find((axis) => axis.axisId === 'validationStrength')?.status).toBe('partial');
  });

  it('RIDM AI: 콘셉트만 있으면 판단을 보류하고 결제자·직무를 핵심 미검증으로 둔다', () => {
    const judgment = analyzeCase('ridm');

    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
    expect(['judgment_deferred', 'insufficient_basis']).toContain(judgment.verdictId);
    expect(['S0', 'S1', 'S2']).toContain(judgment.stageId);
    expect(judgment.judgment).toMatch(/보류|부족/);
    expect(judgment.criticalUnknown).toMatch(/직무|결제|돈|Job/);
    expect(judgment.decisionChangingEvidence).toMatch(/결제|지불|유료|직무/);
    expect(judgment.validationPriority).toMatch(/결제|직무|Job/);
    expect(judgment.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(true);
    expect(judgment.whyPossible).toMatch(/거의 없다|사실이 없다|미검증/);
  });
});
