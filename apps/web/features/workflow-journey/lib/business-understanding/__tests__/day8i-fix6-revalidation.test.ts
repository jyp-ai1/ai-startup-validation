/**
 * Generates DAY 8-I P0 FIX-6 REVALIDATION report for CPO review.
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
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';
import { evaluateAllFix6Turns } from '../day8i-fix6-turn-acceptance';
import { buildEvidenceSourceMap } from '../ai-pm-judgment-evidence-review';

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

describe('DAY 8-I P0 FIX-6 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
    setAiPmJudgmentFix6V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    setAiPmJudgmentFix6V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-6 revalidation report with evidence-grounded judgment gates', () => {
    const projectId = `fix6-reval-${Date.now()}`;
    const result = runDay8iConversation({ projectId });
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    const base = evaluateFix4Revalidation(result);
    const fix6Failures = evaluateAllFix6Turns(result.turns, result.finalJudgmentSnapshot);
    const overallPass = base.fix4OverallPass && fix6Failures.length === 0;

    let report = formatFix4RevalidationReport(
      result,
      {
        commitSha: gitSha(),
        branch: gitBranch(),
        executedAt: new Date().toISOString(),
        pipeline:
          'CEO Answer → Meaning → Evidence Span → Judgment Structure → Source Turn → Business Review',
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
        semanticChainFailures: [...base.semanticChainFailures, ...fix6Failures],
      },
    );

    report = report.replace(
      '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
      '# ALABOM — DAY 8-I P0 FIX-6 REVALIDATION Report',
    );
    report = report.replace(
      '> **CPO FIX-4 독립 검증용.**',
      '> **CPO FIX-6 독립 검증용.** Evidence-grounded judgment + priority correction + dynamic focus.',
    );
    report = report.replace(
      '| Judgment Meaning Model | ON |',
      '| Judgment Meaning Model | ON |\n| Judgment FIX-5 (structured) | ON |\n| Judgment FIX-6 (evidence model) | ON |',
    );

    const evidenceMap = result.finalJudgmentSnapshot
      ? buildEvidenceSourceMap(result.finalJudgmentSnapshot)
      : '(no final state)';

    const fix6Section = [
      '',
      '---',
      '',
      '## Section P — FIX-6 CPO Gate Summary',
      '',
      '| P0 | Requirement | Verdict |',
      '|----|-------------|---------|',
      `| P0-1 | Judgment evidence model (conclusion + evidence[]) | ${fix6Failures.every((f) => !f.field.includes('evidence.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-2 | T22 priority correction (replace not append) | ${fix6Failures.every((f) => f.turnIndex !== 22) ? 'PASS' : 'FAIL'} |`,
      `| P0-3 | Final Business Review evidence-grounded | ${fix6Failures.every((f) => !f.field.startsWith('evidence.')) ? 'PASS' : 'FAIL'} |`,
      `| P0-4 | Dynamic next judgment focus | ${fix6Failures.some((f) => f.field.includes('focus')) ? 'FAIL' : 'PASS'} |`,
      `| P0-5 | Structured solution CEO display | ${fix6Failures.every((f) => !f.field.includes('solution')) ? 'PASS' : 'FAIL'} |`,
      `| P0-6 | T26 expectation vs validated fact | ${fix6Failures.every((f) => f.turnIndex !== 26) ? 'PASS' : 'FAIL'} |`,
      '',
      '### Evidence Source Map (Section I — FIX-6)',
      '',
      evidenceMap,
      '',
      fix6Failures.length
        ? `FIX-6 failures (${fix6Failures.length}):\n${fix6Failures.map((f) => `- Turn ${f.turnIndex} [${f.label}] ${f.field}: ${f.actual}`).join('\n')}`
        : 'FIX-6 failures: 0',
      '',
    ].join('\n');

    report += fix6Section;

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX6_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix6-reval] Report: ${outPath}`);
    console.info(`[fix6-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${fix6Failures.length} fix6 failures)`);

    expect(report).toContain('Section P');
    expect(report).toContain('Evidence Source Map');
    expect(overallPass, `CPO FIX-6 must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
