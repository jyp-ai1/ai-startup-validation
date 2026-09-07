/**
 * Generates DAY 8-I P0 FIX-4 REVALIDATION report for CPO review.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

import { runDay8iConversation } from '../day8i-conversation-harness';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentMeaningModelV1ForTest } from '../ai-pm-judgment-meaning-model-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';

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

export function generateFix4RevalidationReport(): {
  report: string;
  overallPass: boolean;
  semanticChainFailureCount: number;
} {
  stubSessionStorage();
  setV3ReviewPipelineForTest(true);
  setAiPmJudgmentAggregationV1ForTest(true);
  setAiPmAnswerSemanticSotV1ForTest(true);
  setAiPmJudgmentMeaningModelV1ForTest(true);

  const projectId = `fix4-reval-${Date.now()}`;
  const result = runDay8iConversation({ projectId });
  clearAiPmLoopState(projectId);
  clearProjectConsultingState(projectId);

  const reval = evaluateFix4Revalidation(result);
  const report = formatFix4RevalidationReport(
    result,
    {
      commitSha: gitSha(),
      branch: gitBranch(),
      executedAt: new Date().toISOString(),
      pipeline:
        'CEO Answer → V3 Review → Semantic SoT → Meaning Unit → Evidence → Dimension → Accumulative Judgment → Trace → Review UX → Business Review',
      flags: {
        v3ReviewPipeline: true,
        judgmentAggregation: true,
        answerSemanticSot: true,
      },
      meaningModel: true,
    },
    reval,
  );

  return {
    report,
    overallPass: reval.fix4OverallPass,
    semanticChainFailureCount: reval.semanticChainFailures.length,
  };
}

describe('DAY 8-I P0 FIX-4 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-4 Sections A–N revalidation report', () => {
    const { report, overallPass, semanticChainFailureCount } =
      generateFix4RevalidationReport();

    expect(report).toContain('## Section K');
    expect(report).toContain('## Section M');
    expect(report).toContain('Judgment Meaning Model');
    expect(report).toContain('[현재 AI 판단]');
    expect(report).toContain('알겠습니다. 경쟁사');

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX4_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix4-reval] Report: ${outPath}`);
    console.info(
      `[fix4-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${semanticChainFailureCount} semantic chain failures)`,
    );

    expect(overallPass, `CPO FIX-4 revalidation must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
