/**
 * Generates DAY 8-I P0 FIX-9 REVALIDATION report for CPO review.
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
import { setAiPmJudgmentFix9V1ForTest } from '../ai-pm-judgment-fix9-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import {
  evaluateFix4Revalidation,
  formatFix4RevalidationReport,
} from '../day8i-fix4-revalidation-report';
import { evaluateAllFix9Turns } from '../day8i-fix9-turn-acceptance';
import { buildStructuredFinalReview } from '../ai-pm-judgment-structured-review';
import { buildCustomerChangeProvenance } from '../ai-pm-judgment-canonical-state';
import { runAllCpoChecks } from '../day8i-cpo-r-extended-checks';

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

describe('DAY 8-I P0 FIX-9 REVALIDATION', () => {
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
    setAiPmJudgmentFix9V1ForTest(true);
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
    setAiPmJudgmentFix9V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-9 revalidation report with R1-R25 zero FAIL and preservation gates', () => {
    const projectId = `fix9-reval-${Date.now()}`;
    const result = runDay8iConversation({ projectId });
    clearAiPmLoopState(projectId);
    clearProjectConsultingState(projectId);

    const base = evaluateFix4Revalidation(result);
    const fix9Failures = evaluateAllFix9Turns(result.turns, result.finalJudgmentSnapshot);
    const cpoChecks = runAllCpoChecks();
    const cpoFailed = cpoChecks.filter((c) => c.verdict === 'FAIL');
    const overallPass = base.fix4OverallPass && fix9Failures.length === 0 && cpoFailed.length === 0;

    let report = formatFix4RevalidationReport(
      result,
      {
        commitSha: gitSha(),
        branch: gitBranch(),
        executedAt: new Date().toISOString(),
        pipeline:
          'CEO Answer → Canonical Judgment (preserved) → Evidence Provenance → R1-R25 → Final Review',
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
        semanticChainFailures: [...base.semanticChainFailures, ...fix9Failures],
      },
    );

    report = report.replace(
      '# ALABOM — DAY 8-I P0 FIX-4 REVALIDATION Report',
      '# ALABOM — DAY 8-I P0 FIX-9 REVALIDATION Report',
    );
    report = report.replace(
      '> **CPO FIX-4 독립 검증용.**',
      '> **CPO FIX-9 독립 검증용.** Canonical preservation + R1-R25 zero FAIL + evidence provenance.',
    );
    report = report.replace(
      '| Judgment Meaning Model | ON |',
      '| Judgment Meaning Model | ON |\n| Judgment FIX-5~8 | ON |\n| Judgment FIX-9 | ON |',
    );

    const structuredReview = result.finalJudgmentSnapshot
      ? buildStructuredFinalReview(result.finalJudgmentSnapshot)
      : '(no final state)';

    const ccProv = result.finalJudgmentSnapshot
      ? buildCustomerChangeProvenance(result.finalJudgmentSnapshot.dimensions.customerChange)
      : null;

    const rTable = cpoChecks
      .map((c) => `| ${c.id} | ${c.verdict} | ${c.rationale.slice(0, 80)} |`)
      .join('\n');

    const criticalR = ['CPO-R8', 'CPO-R16', 'CPO-R20']
      .map((id) => cpoChecks.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `- **${c!.id}**: ${c!.verdict} — ${c!.rationale}`)
      .join('\n');

    const fix9Section = [
      '',
      '---',
      '',
      '## Section S — FIX-9 CPO Gate Summary',
      '',
      '| P0 | Requirement | Verdict |',
      '|----|-------------|---------|',
      `| P0-1 | Existing canonical state protection (T06) | ${fix9Failures.every((f) => !f.field.includes('customer')) ? 'PASS' : 'FAIL'} |`,
      `| P0-2 | Evidence canonical objects | ${fix9Failures.every((f) => !f.field.includes('provenance')) ? 'PASS' : 'FAIL'} |`,
      `| P0-3 | T09/T22 strict evidence + RELATED source | ${fix9Failures.every((f) => !f.field.includes('severity') && !f.field.includes('primary')) ? 'PASS' : 'FAIL'} |`,
      `| P0-4 | Customer Change provenance | ${fix9Failures.every((f) => !f.field.includes('validation')) ? 'PASS' : 'FAIL'} |`,
      `| P0-5 | Snapshot R20 immutable A/B | ${cpoFailed.every((f) => f.id !== 'CPO-R20') ? 'PASS' : 'FAIL'} |`,
      `| P0-6 | R1~R25 zero FAIL | ${cpoFailed.length === 0 ? 'PASS' : 'FAIL'} |`,
      '',
      '### Critical R Checks',
      '',
      criticalR,
      '',
      '### R1~R25 Full Table',
      '',
      '| ID | Verdict | Rationale |',
      '|----|---------|-----------|',
      rTable,
      '',
      `**FAILURES: ${cpoFailed.length + fix9Failures.filter((f) => f.label !== 'FIX-9 CPO-R gate').length}**`,
      '',
      '### Customer Change Provenance',
      '',
      ccProv ? JSON.stringify(ccProv, null, 2) : '(none)',
      '',
      '### Structured Final Review',
      '',
      structuredReview,
      '',
      fix9Failures.length
        ? `FIX-9 failures (${fix9Failures.length}):\n${fix9Failures.map((f) => `- Turn ${f.turnIndex} [${f.label}] ${f.field}: ${f.actual}`).join('\n')}`
        : 'FIX-9 failures: 0',
      '',
    ].join('\n');

    report += fix9Section;

    const outDir = path.resolve(__dirname, '../../../../../../../docs/evidence/ALABOM');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'DAY_8I_P0_FIX9_REVALIDATION_REPORT.md');
    fs.writeFileSync(outPath, report, 'utf8');

    console.info(`[fix9-reval] Report: ${outPath}`);
    console.info(
      `[fix9-reval] Overall: ${overallPass ? 'PASS' : 'FAIL'} (${fix9Failures.length} fix9, ${cpoFailed.length} R fails)`,
    );

    expect(report).toContain('Section S');
    expect(report).toContain('FAILURES: 0');
    expect(cpoFailed.length).toBe(0);
    expect(overallPass, `CPO FIX-9 must PASS — see ${outPath}`).toBe(true);
  }, 180_000);
});
