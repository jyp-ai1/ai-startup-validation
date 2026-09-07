/**
 * Generates DAY 8-I P0 FIX-5 REVALIDATION report for CPO review.
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
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';
import { evaluateAllFix5Turns } from '../day8i-fix5-turn-acceptance';

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

describe('DAY 8-I P0 FIX-5 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-5 revalidation report with structured judgment gates', () => {
    const projectId = `fix5-reval-${Date.now()}`;
    const result = runDay8iConversation({ projectId });
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    const base = evaluateFix4Revalidation(result);
    const fix5Failures = evaluateAllFix5Turns(result.turns, result.finalJudgmentSnapshot);
    const overallPass = base.fix4OverallPass && fix5Failures.length === 0;

    let report = formatFix4RevalidationReport(
      result,
      {
        commitSha: gitSha(),
        branch: gitBranch(),
        executedAt: new Date().toISOString(),
        pipeline:
          'CEO Answer → Semantic SoT → Structured Judgment → Evidence → Trace → Review UX → Business Review',
        flags: {
          v3ReviewPipeline: true,
          judgmentAggregation: true,
          answerSemanticSot: true,
        },
        meaningModel: true,
      },
      { ...base, fix4OverallPass: overallPass, semanticChainFailures: [...base.semanticChainFailures, ...fix5Failures] },
    );

    report = report.replace(
      '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
      '# ALABOM — DAY 8-I P0 FIX-5 REVALIDATION Report',
    );
    report = report.replace(
      '> **CPO FIX-4 독립 검증용.**',
      '> **CPO FIX-5 독립 검증용.** Structured judgment + meta slot + hypothesis typing.',
    );
    report = report.replace(
      '| Judgment Meaning Model | ON |',
      '| Judgment Meaning Model | ON |\n| Judgment FIX-5 (structured) | ON |',
    );

    const fix5Section = [
      '',
      '---',
      '',
      '## Section O — FIX-5 CPO Gate Summary',
      '',
      '| P0 | Requirement | Verdict |',
      '|----|-------------|---------|',
      `| P0-1 | T29 meta confirmation → no judgment update | ${fix5Failures.every((f) => f.turnIndex !== 29) ? 'PASS' : 'FAIL'} |`,
      `| P0-2 | Structured solution (not raw · append) | ${fix5Failures.every((f) => !f.field.includes('solution')) ? 'PASS' : 'FAIL'} |`,
      `| P0-3 | CustomerChange FACT / HYPOTHESIS | ${fix5Failures.every((f) => !f.field.includes('hypothesis')) ? 'PASS' : 'FAIL'} |`,
      `| P0-4 | Semantic chain + evidence units | ${base.semanticChainFailures.length === 0 ? 'PASS' : 'FAIL'} |`,
      `| P0-5 | Review mode next judgment focus | ${result.turns.some((t) => t.question.includes('[다음 AI 판단 초점]')) ? 'PASS' : 'FAIL'} |`,
      '',
      fix5Failures.length
        ? `FIX-5 failures (${fix5Failures.length}):\n${fix5Failures.map((f) => `- Turn ${f.turnIndex} [${f.label}] ${f.field}: ${f.actual}`).join('\n')}`
        : 'FIX-5 failures: 0',
      '',
    ].join('\n');

    report += fix5Section;

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX5_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix5-reval] Report: ${outPath}`);
    console.info(`[fix5-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${fix5Failures.length} fix5 failures)`);

    expect(report).toContain('Section O');
    expect(report).toContain('[다음 AI 판단 초점]');
    expect(overallPass, `CPO FIX-5 must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
