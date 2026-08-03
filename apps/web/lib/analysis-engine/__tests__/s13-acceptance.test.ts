/**
 * S13 Acceptance Contract tests — Rule ↔ Test 1:1 + §1–§5.
 * Catalog: R-01 · R-02 · R-03 · R-05 · R-06 (R-04 Folded — not a Decision Rule).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ANALYSIS_RULES,
  listRuleIds,
  runAnalysis,
  type AnalysisInput,
} from '../index';

const ENGINE_DIR = join(fileURLToPath(new URL('.', import.meta.url)), '..');

function base(partial: Partial<AnalysisInput> & Pick<AnalysisInput, 'evidence'>): AnalysisInput {
  return {
    stage: partial.stage ?? 'idea',
    businessType: partial.businessType ?? 'generic',
    evidence: partial.evidence,
  };
}

describe('S13 Acceptance §4 Rule Coverage 1:1', () => {
  it('every shipped rule id has a dedicated suite below', () => {
    expect(listRuleIds().sort()).toEqual(
      ['R-01', 'R-02', 'R-03', 'R-05', 'R-06'].sort(),
    );
  });

  it('R-04 Fold: ProblemFit must never appear as a Decision', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          problem: 'confirmed',
          revenue: 'confirmed',
        },
      }),
    );
    expect(result.decisions.some((d) => (d.code as string) === 'ProblemFit')).toBe(
      false,
    );
    expect(listRuleIds()).not.toContain('R-04');
  });
});

describe('R-01', () => {
  it('PASS: customer+problem confirmed, revenue unknown → RevenueValidation Insufficient', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          problem: 'confirmed',
          revenue: 'unknown',
        },
      }),
    );
    const d = result.decisions.find((x) => x.code === 'RevenueValidation');
    expect(d).toMatchObject({
      value: 'Insufficient',
      ruleId: 'R-01',
      evidenceRefs: expect.arrayContaining(['customer', 'problem', 'revenue']),
    });
    const action = result.actions.find((a) => a.ruleId === 'R-01');
    expect(action?.action).toBe('수익 구조를 먼저 검증하세요.');
    const insight = result.insights.find((i) => i.ruleId === 'R-01');
    expect(insight?.claim).toContain('Problem Fit');
  });
});

describe('R-02', () => {
  it('PASS: customer confirmed, revenue assumed → RevenueValidation Fragile', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          problem: 'confirmed',
          revenue: 'assumed',
        },
      }),
    );
    const d = result.decisions.find((x) => x.code === 'RevenueValidation');
    expect(d).toMatchObject({
      value: 'Fragile',
      ruleId: 'R-02',
    });
  });
});

describe('R-03', () => {
  it('PASS: customer+revenue confirmed → MarketJudgment Ready', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          revenue: 'confirmed',
          problem: 'confirmed',
        },
      }),
    );
    const d = result.decisions.find((x) => x.code === 'MarketJudgment');
    expect(d).toMatchObject({
      value: 'Ready',
      ruleId: 'R-03',
    });
    const insight = result.insights.find((i) => i.ruleId === 'R-03');
    expect(insight?.claim).toContain('Problem Fit');
  });
});

describe('R-05', () => {
  it('PASS: customer unknown → AnalysisGate Blocked', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'unknown',
          problem: 'unknown',
          revenue: 'unknown',
        },
      }),
    );
    const d = result.decisions.find((x) => x.code === 'AnalysisGate');
    expect(d).toMatchObject({
      value: 'Blocked',
      ruleId: 'R-05',
    });
    expect(result.actions.find((a) => a.ruleId === 'R-05')?.action).toBe(
      '고객을 먼저 확인하세요.',
    );
  });
});

describe('R-06', () => {
  it('PASS: idea stage, customer confirmed, payer unknown → Revenue Insufficient', () => {
    const result = runAnalysis(
      base({
        stage: 'idea',
        evidence: {
          customer: 'confirmed',
          problem: 'unknown',
          payer: 'unknown',
          revenue: 'unknown',
        },
      }),
    );
    const d = result.decisions.find((x) => x.code === 'RevenueValidation');
    expect(d).toMatchObject({
      value: 'Insufficient',
      ruleId: 'R-06',
      evidenceRefs: expect.arrayContaining(['customer', 'payer']),
    });
  });
});

describe('S13 Acceptance §1 Determinism', () => {
  it('100 identical runs produce identical JSON', () => {
    const input = base({
      stage: 'mvp',
      businessType: 'saas',
      evidence: {
        customer: 'confirmed',
        problem: 'confirmed',
        revenue: 'unknown',
      },
    });
    const first = JSON.stringify(runAnalysis(input));
    for (let i = 0; i < 100; i++) {
      expect(JSON.stringify(runAnalysis(input))).toBe(first);
    }
  });
});

describe('S13 Acceptance §2 Traceability', () => {
  it('every Decision names ruleId and ≥1 evidenceRefs', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          problem: 'confirmed',
          revenue: 'unknown',
        },
      }),
    );
    expect(result.decisions.length).toBeGreaterThan(0);
    for (const d of result.decisions) {
      expect(d.ruleId).toMatch(/^R-\d+$/);
      expect(d.evidenceRefs.length).toBeGreaterThan(0);
    }
  });
});

describe('S13 Acceptance §3 No Hallucination', () => {
  it('every Insight cites ≥1 Evidence id from its Decision', () => {
    const result = runAnalysis(
      base({
        evidence: {
          customer: 'confirmed',
          problem: 'confirmed',
          revenue: 'unknown',
        },
      }),
    );
    for (const insight of result.insights) {
      expect(insight.basisEvidenceIds.length).toBeGreaterThan(0);
      const decision = result.decisions.find((d) => d.ruleId === insight.ruleId);
      expect(decision).toBeDefined();
      for (const id of insight.basisEvidenceIds) {
        expect(decision!.evidenceRefs).toContain(id);
      }
    }
  });
});

describe('S13 Acceptance §5 Engine Purity', () => {
  it('engine modules have no JSX / react / next-intl imports', () => {
    const files = readdirSync(ENGINE_DIR).filter((f) => /\.tsx?$/.test(f));
    expect(files.some((f) => f.endsWith('.tsx'))).toBe(false);
    for (const file of files) {
      const src = readFileSync(join(ENGINE_DIR, file), 'utf8');
      expect(src).not.toMatch(/from ['"]react(['"]|\/)/);
      expect(src).not.toMatch(/from ['"]react-dom/);
      expect(src).not.toMatch(/from ['"]next-intl/);
      expect(src).not.toMatch(/from ['"]next\//);
    }
  });

  it('catalog rules match ANALYSIS_RULES length to unique ids', () => {
    const ids = ANALYSIS_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
