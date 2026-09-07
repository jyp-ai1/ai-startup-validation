/**
 * Generates DAY 8-I P0 FIX-10 REVALIDATION report for CPO review.
 * Report path: docs/evidence/ALABOM/DAY_8I_P0_FIX10_REVALIDATION_REPORT.md
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
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { setAiPmAnswerTargetBindingV1ForTest } from '../ai-pm-answer-target-binding-policy-v1';
import { clearAiPmLoopState } from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';
import { evaluateAllFix10Turns } from '../day8i-fix10-turn-acceptance';
import {
  CEO_BREWERY_INTAKE_DOC,
  FIX10_BREWERY_SCENARIO,
} from '../day8i-fix10-brewery-scenario';
import { probeFix10InitialState } from '../day8i-fix10-probe-initial';
import {
  evaluateFix10Revalidation,
  formatFix10RevalidationReport,
} from '../day8i-fix10-revalidation-report';

const REPORT_PATH = path.join(
  process.cwd(),
  '../../docs/evidence/ALABOM/DAY_8I_P0_FIX10_REVALIDATION_REPORT.md',
);

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

describe('DAY 8-I P0 FIX-10 REVALIDATION', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmAnswerSemanticSotV1ForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    setAiPmAnswerTargetBindingV1ForTest(true);
    setAiPmJudgmentMeaningModelV1ForTest(true);
    setAiPmJudgmentFix5V1ForTest(true);
    setAiPmJudgmentFix6V1ForTest(true);
    setAiPmJudgmentFix7V1ForTest(true);
    setAiPmJudgmentFix8V1ForTest(true);
    setAiPmJudgmentFix9V1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    setAiPmAnswerSemanticSotV1ForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    setAiPmAnswerTargetBindingV1ForTest(null);
    setAiPmJudgmentMeaningModelV1ForTest(null);
    setAiPmJudgmentFix5V1ForTest(null);
    setAiPmJudgmentFix6V1ForTest(null);
    setAiPmJudgmentFix7V1ForTest(null);
    setAiPmJudgmentFix8V1ForTest(null);
    setAiPmJudgmentFix9V1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('generates FIX-10 revalidation report (Scenarios A-J + FIX10-R01~R25)', () => {
    const probeProjectId = `fix10-probe-${Date.now()}`;
    const breweryProjectId = `fix10-brewery-${Date.now()}`;
    const regressionProjectId = `fix10-regression-${Date.now()}`;

    const initialProbe = probeFix10InitialState({
      projectId: probeProjectId,
      documentText: CEO_BREWERY_INTAKE_DOC,
    });
    clearAiPmLoopState(probeProjectId);

    const breweryResult = runDay8iConversation({
      projectId: breweryProjectId,
      documentText: CEO_BREWERY_INTAKE_DOC,
      steps: FIX10_BREWERY_SCENARIO,
    });

    const regression30Result = runDay8iConversation({
      projectId: regressionProjectId,
    });

    clearAiPmLoopState(breweryProjectId);
    clearProjectConsultingState(breweryProjectId);
    clearAiPmLoopState(regressionProjectId);
    clearProjectConsultingState(regressionProjectId);

    let buildPass = true;
    if (process.env.FIX10_SKIP_BUILD !== '1') {
      try {
        execSync('pnpm build', {
          cwd: path.join(process.cwd(), '../..'),
          stdio: 'pipe',
          timeout: 180_000,
        });
      } catch {
        buildPass = false;
      }
    }

    const revalInput = {
      commitSha: gitSha(),
      branch: gitBranch(),
      executedAt: new Date().toISOString(),
      buildPass,
      initialProbe,
      breweryResult,
      regression30Result,
    };

    const reval = evaluateFix10Revalidation(revalInput);
    const report = formatFix10RevalidationReport(revalInput, reval);

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report, 'utf8');

    console.log(`[fix10-reval] Report: ${REPORT_PATH}`);
    console.log(
      `[fix10-reval] Overall: ${reval.overallPass ? 'PASS' : 'FAIL'} (${reval.rChecks.filter((c) => c.verdict === 'FAIL').length} R fails, ${reval.scenarios.filter((s) => s.verdict === 'FAIL').length} scenario fails)`,
    );

    const unitFailures = evaluateAllFix10Turns(breweryResult.finalJudgmentSnapshot);
    expect(unitFailures).toEqual([]);

    if (!reval.overallPass) {
      const failed = reval.rChecks.filter((c) => c.verdict === 'FAIL');
      const failedScenarios = reval.scenarios.filter((s) => s.verdict === 'FAIL');
      console.log('[fix10-reval] Failed R:', failed.map((f) => f.id).join(', '));
      console.log('[fix10-reval] Failed scenarios:', failedScenarios.map((s) => s.id).join(', '));
    }

    expect(reval.overallPass).toBe(true);
  });
});
