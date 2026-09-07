/**
 * Generates DAY 8-I P0 FIX-7 REVALIDATION report for CPO review.
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
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';
import { evaluateAllFix7Turns } from '../day8i-fix7-turn-acceptance';
import { buildStructuredFinalReview } from '../ai-pm-judgment-structured-review';

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

describe('DAY 8-I P0 FIX-7 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
    setAiPmJudgmentFix6V1ForTest(true);
    setAiPmJudgmentFix7V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    setAiPmJudgmentFix6V1ForTest(null);
    setAiPmJudgmentFix7V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-7 revalidation report with strict structured final review gates', () => {
    const projectId = `fix7-reval-${Date.now()}`;
    const result = runDay8iConversation({ projectId });
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    const base = evaluateFix4Revalidation(result);
    const fix7Failures = evaluateAllFix7Turns(result.turns, result.finalJudgmentSnapshot);
    const overallPass = base.fix4OverallPass && fix7Failures.length === 0;

    let report = formatFix4RevalidationReport(
      result,
      {
        commitSha: gitSha(),
        branch: gitBranch(),
        executedAt: new Date().toISOString(),
        pipeline:
          'CEO Answer → Structured Judgment → Evidence Span → Source Turn → Final Review',
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
        semanticChainFailures: [...base.semanticChainFailures, ...fix7Failures],
      },
    );

    report = report.replace(
      '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
      '# ALABOM — DAY 8-I P0 FIX-7 REVALIDATION Report',
    );
    report = report.replace(
      '> **CPO FIX-4 독립 검증용.**',
      '> **CPO FIX-7 독립 검증용.** Structured final review + strict evidence + milestone focus.',
    );
    report = report.replace(
      '| Judgment Meaning Model | ON |',
      '| Judgment Meaning Model | ON |\n| Judgment FIX-5 | ON |\n| Judgment FIX-6 | ON |\n| Judgment FIX-7 | ON |',
    );

    const structuredReview = result.finalJudgmentSnapshot
      ? buildStructuredFinalReview(result.finalJudgmentSnapshot)
      : '(no final state)';

    const fix7Section = [
      '',
      '---',
      '',
      '## Section Q — FIX-7 CPO Gate Summary',
      '',
      '| P0 | Requirement | Verdict |',
      '|----|-------------|---------|',
      `| P0-1 | Final review from structured judgment | ${fix7Failures.every((f) => !f.field.includes('notAccumulated')) ? 'PASS' : 'FAIL'} |`,
      `| P0-2 | T22 true problem replace (PRIMARY+RELATED) | ${fix7Failures.every((f) => !f.field.startsWith('problem.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-3 | Solution per-layer source trace | ${fix7Failures.every((f) => !f.field.startsWith('solution.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-4 | Status promotion block (T26/T30) | ${fix7Failures.every((f) => !f.field.includes('status')) && fix7Failures.every((f) => !f.field.includes('customerChange')) ? 'PASS' : 'FAIL'} |`,
      `| P0-5 | Milestone next focus (T04/T08/T18/T22/T28) | ${fix7Failures.every((f) => !f.field.startsWith('focus.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-6 | Strict final review (no Aligned without source) | ${fix7Failures.every((f) => !f.field.startsWith('alignment.') && !f.field.startsWith('alignedWithoutSource')) ? 'PASS' : 'FAIL'} |`,
      '',
      '### Structured Final Review',
      '',
      structuredReview,
      '',
      fix7Failures.length
        ? `FIX-7 failures (${fix7Failures.length}):\n${fix7Failures.map((f) => `- Turn ${f.turnIndex} [${f.label}] ${f.field}: ${f.actual}`).join('\n')}`
        : 'FIX-7 failures: 0',
      '',
    ].join('\n');

    report += fix7Section;

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX7_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix7-reval] Report: ${outPath}`);
    console.info(`[fix7-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${fix7Failures.length} fix7 failures)`);

    expect(report).toContain('Section Q');
    expect(report).toContain('PRIMARY:');
    expect(overallPass, `CPO FIX-7 must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
