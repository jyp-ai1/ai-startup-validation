/**
 * Generates DAY 8-I P0 FIX-3 REVALIDATION report for CPO 4차 review.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDay8iConversation } from '../day8i-conversation-harness';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix3Revalidation,
  formatFix3RevalidationReport,
} from '../day8i-fix3-revalidation-report';

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

export function generateFix3RevalidationReport(): {
  report: string;
  overallPass: boolean;
  criticalFailureCount: number;
} {
  stubSessionStorage();
  setV3ReviewPipelineForTest(true);
  setAiPmJudgmentAggregationV1ForTest(true);
  setAiPmAnswerSemanticSotV1ForTest(true);

  const projectId = `fix3-reval-${Date.now()}`;
  const result = runDay8iConversation({ projectId });
  clearAiPmLoopState(projectId);
  clearProjectConsultingState(projectId);

  const reval = evaluateFix3Revalidation(result);
  const report = formatFix3RevalidationReport(result, {
    commitSha: gitSha(),
    branch: gitBranch(),
    executedAt: new Date().toISOString(),
    pipeline:
      'CEO Answer → V3 Review → Semantic SoT → Evidence → Dimension → Judgment → Trace → Next Decision → Business Review',
    flags: {
      v3ReviewPipeline: true,
      judgmentAggregation: true,
      answerSemanticSot: true,
    },
  }, reval);

  return {
    report,
    overallPass: reval.overallPass,
    criticalFailureCount: reval.criticalFailures.length,
  };
}

describe('DAY 8-I P0 FIX-3 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates Sections A–J revalidation report', () => {
    const { report, overallPass, criticalFailureCount } = generateFix3RevalidationReport();

    expect(report).toContain('## Section A');
    expect(report).toContain('## Section B');
    expect(report).toContain('## Section J');
    expect(report).toContain('Turn 01');
    expect(report).toContain('Turn 30');
    expect(report).toContain('Section I — Final Business Review');

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX3_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix3-reval] Report: ${outPath}`);
    console.info(`[fix3-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${criticalFailureCount} critical failures)`);

    expect(overallPass, `CPO revalidation must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
