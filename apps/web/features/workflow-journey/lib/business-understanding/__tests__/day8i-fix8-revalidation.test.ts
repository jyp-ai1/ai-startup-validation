/**
 * Generates DAY 8-I P0 FIX-8 REVALIDATION report for CPO review.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDay8iConversation } from '../day8i-conversation-harness';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentMeaningModelV1ForTest } from '../ai-pm-judgment-meaning-model-v1';
import { setAiPmJudgmentFix5V1ForTest } from '../ai-pm-judgment-fix5-v1';
import { setAiPmJudgmentFix6V1ForTest } from '../ai-pm-judgment-fix6-v1';
import { setAiPmJudgmentFix7V1ForTest } from '../ai-pm-judgment-fix7-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';
import { evaluateAllFix8Turns } from '../day8i-fix8-turn-acceptance';
import { buildStructuredFinalReview } from '../ai-pm-judgment-structured-review';
import { CUSTOMER_CHANGE_CLAIM_LABEL } from '../ai-pm-judgment-canonical-state';

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function gitBranch(): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

describe('DAY 8-I P0 FIX-8 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
    setAiPmJudgmentFix6V1ForTest(true);
    setAiPmJudgmentFix7V1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    setAiPmJudgmentFix6V1ForTest(null);
    setAiPmJudgmentFix7V1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-8 revalidation report with canonical judgment state gates', () => {
    const projectId = `fix8-reval-${Date.now()}`;
    const result = runDay8iConversation({ projectId });
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    const base = evaluateFix4Revalidation(result);
    const fix8Failures = evaluateAllFix8Turns(result.turns, result.finalJudgmentSnapshot);
    const overallPass = base.fix4OverallPass && fix8Failures.length === 0;

    let report = formatFix4RevalidationReport(
      result,
      {
        commitSha: gitSha(),
        branch: gitBranch(),
        executedAt: new Date().toISOString(),
        pipeline:
          'CEO Answer → Canonical Judgment State → Evidence Fidelity → Source Turn → Final Review',
        flags: {
          v3ReviewPipeline: true,
          judgmentAggregation: true,
          answerSemanticSot: true,
        },
        meaningModel: true,
      },
      {
        ...base,
        fix4OverallPass: overallPass,
        semanticChainFailures: [...base.semanticChainFailures, ...fix8Failures],
      },
    );

    report = report.replace(
      '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
      '# ALABOM — DAY 8-I P0 FIX-8 REVALIDATION Report',
    );
    report = report.replace(
      '> **CPO FIX-4 독립 검증용.**',
      '> **CPO FIX-8 독립 검증용.** Canonical current judgment + evidence fidelity + state-based focus.',
    );
    report = report.replace(
      '| Judgment Meaning Model | ON |',
      '| Judgment Meaning Model | ON |\n| Judgment FIX-5 | ON |\n| Judgment FIX-6 | ON |\n| Judgment FIX-7 | ON |\n| Judgment FIX-8 | ON |',
    );

    const structuredReview = result.finalJudgmentSnapshot
      ? buildStructuredFinalReview(result.finalJudgmentSnapshot)
      : '(no final state)';

    const fix8Section = [
      '',
      '---',
      '',
      '## Section R — FIX-8 CPO Gate Summary',
      '',
      '| P0 | Requirement | Verdict |',
      '|----|-------------|---------|',
      `| P0-1 | Dimension별 단일 Current Judgment | ${fix8Failures.every((f) => !f.field.includes('summary')) ? 'PASS' : 'FAIL'} |`,
      `| P0-2 | Problem primary+related (no · append) | ${fix8Failures.every((f) => !f.field.includes('notAccumulated') && !f.field.includes('summary')) ? 'PASS' : 'FAIL'} |`,
      `| P0-3 | Evidence fidelity (T09/T22 full span) | ${fix8Failures.every((f) => !f.field.includes('evidence') && !f.field.includes('severity')) ? 'PASS' : 'FAIL'} |`,
      `| P0-4 | Customer Change claim label + status lock | ${fix8Failures.every((f) => !f.field.includes('customerChange') && !f.field.includes('label')) ? 'PASS' : 'FAIL'} |`,
      `| P0-5 | State-based dynamic next focus | ${fix8Failures.every((f) => !f.field.startsWith('focus.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-6 | Final Review = canonical state output | ${fix8Failures.every((f) => !f.field.includes('summarySync') && !f.field.includes('canonical')) ? 'PASS' : 'FAIL'} |`,
      '',
      `Customer Change heading: \`${CUSTOMER_CHANGE_CLAIM_LABEL}\``,
      '',
      '### Structured Final Review',
      '',
      structuredReview,
      '',
      fix8Failures.length
        ? `FIX-8 failures (${fix8Failures.length}):\n${fix8Failures.map((f) => `- Turn ${f.turnIndex} [${f.label}] ${f.field}: ${f.actual}`).join('\n')}`
        : 'FIX-8 failures: 0',
      '',
    ].join('\n');

    report += fix8Section;

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX8_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix8-reval] Report: ${outPath}`);
    console.info(`[fix8-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${fix8Failures.length} fix8 failures)`);

    expect(report).toContain('Section R');
    expect(report).toContain('PRIMARY:');
    expect(report).toContain(CUSTOMER_CHANGE_CLAIM_LABEL);
    expect(overallPass, `CPO FIX-8 must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
