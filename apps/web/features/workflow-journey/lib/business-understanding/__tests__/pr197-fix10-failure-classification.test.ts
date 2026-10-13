/**
 * PR #197 follow-up — classify DAY 8-I FIX-10 overallPass=false.
 * Does not overwrite DAY_8I_P0_FIX10_REVALIDATION_REPORT.md.
 * Does not lower FIX-10 expected wording or force overallPass.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { setAiPmAnswerSemanticSotV1ForTest } from '../ai-pm-answer-semantic-sot-v1';
import { setAiPmAnswerTargetBindingV1ForTest } from '../ai-pm-answer-target-binding-policy-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmJudgmentFix5V1ForTest } from '../ai-pm-judgment-fix5-v1';
import { setAiPmJudgmentFix6V1ForTest } from '../ai-pm-judgment-fix6-v1';
import { setAiPmJudgmentFix7V1ForTest } from '../ai-pm-judgment-fix7-v1';
import { setAiPmJudgmentFix8V1ForTest } from '../ai-pm-judgment-fix8-v1';
import { setAiPmJudgmentFix9V1ForTest } from '../ai-pm-judgment-fix9-v1';
import { setAiPmJudgmentMeaningModelV1ForTest } from '../ai-pm-judgment-meaning-model-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { runDay8iConversation } from '../day8i-conversation-harness';
import {
  CEO_BREWERY_INTAKE_DOC,
  FIX10_BREWERY_SCENARIO,
} from '../day8i-fix10-brewery-scenario';
import { probeFix10InitialState } from '../day8i-fix10-probe-initial';
import { evaluateFix10Revalidation } from '../day8i-fix10-revalidation-report';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  resolveTurnDecision,
  shouldBlockSolutionBeforeIdentity,
} from '../resolve-turn-decision';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import { clearProjectConsultingState } from '../project-consulting-store';

const OUT = path.join(
  process.cwd(),
  '../../docs/evidence/ALABOM/AI-PM/PR197-CPO-FIX10-FAILURE-CLASSIFICATION.json',
);
const IMPLEMENTATION_SHA = 'bcf443b7';

type FailureClass =
  | 'D7_CONFIRM_YES_SURFACE'
  | 'SOLUTION_BEFORE_IDENTITY'
  | 'DOWNSTREAM_OF_D7_SCRIPT'
  | 'REGRESSION_HARNESS'
  | 'BUILD_SKIP'
  | 'OTHER';

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

function classifyId(id: string): FailureClass {
  if (id === 'B' || id === 'FIX10-R02') return 'D7_CONFIRM_YES_SURFACE';
  if (id === 'FIX10-R24') return 'BUILD_SKIP';
  if (id === 'FIX10-R18' || id === 'FIX10-R21' || id === 'FIX10-R22') {
    return 'REGRESSION_HARNESS';
  }
  if (
    id === 'H' ||
    id === 'J' ||
    id === 'FIX10-R14' ||
    id === 'FIX10-F2' ||
    id.startsWith('FIX10-F5-')
  ) {
    return 'DOWNSTREAM_OF_D7_SCRIPT';
  }
  return 'OTHER';
}

describe('PR #197 FIX-10 failure classification', () => {
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

  it('classifies overallPass=false without rewriting FIX-10 expectations', () => {
    const probeProjectId = `fix10-class-probe-${Date.now()}`;
    const breweryProjectId = `fix10-class-brewery-${Date.now()}`;
    const regressionProjectId = `fix10-class-reg-${Date.now()}`;

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

    const reval = evaluateFix10Revalidation({
      commitSha: gitSha(),
      branch: 'cursor/ai-pm-mcq-understanding-e648',
      executedAt: new Date().toISOString(),
      buildPass: false,
      initialProbe,
      breweryResult,
      regression30Result,
    });

    const failedR = reval.rChecks.filter((c) => c.verdict === 'FAIL');
    const failedScenarios = reval.scenarios.filter((s) => s.verdict === 'FAIL');
    const classified = [...failedScenarios, ...failedR].map((item) => ({
      id: item.id,
      expected: 'expected' in item ? item.expected : undefined,
      actual: item.actual,
      class: classifyId(item.id),
    }));

    const emptyGaps = createEmptyGapState();
    const understanding = buildBusinessUnderstanding(CEO_BREWERY_INTAKE_DOC);
    const living = buildLivingUnderstandingState({
      documentText: CEO_BREWERY_INTAKE_DOC,
      understanding,
      turns: [],
      memory: buildConversationMemoryFromSources({
        projectId: 'fix10-class-d4',
        documentText: CEO_BREWERY_INTAKE_DOC,
        turns: [],
      }),
    });
    const turned = resolveTurnDecision({
      living,
      gapState: emptyGaps,
      stageReadiness: evaluateStageReadiness({ gapState: emptyGaps }),
      turns: [],
    });
    const brewerySolutionTurns = breweryResult.turns
      .filter((t) => t.targetGap === 'solution' || t.nextTargetGap === 'solution')
      .map((t) => ({
        turn: t.turnIndex,
        targetGap: t.targetGap,
        nextTargetGap: t.nextTargetGap,
        note: t.note ?? '',
        customerStatus: t.judgmentSnapshot?.dimensions.customer.status ?? 'n/a',
        problemStatus: t.judgmentSnapshot?.dimensions.problem.status ?? 'n/a',
        identityStillOpen:
          t.judgmentSnapshot?.dimensions.customer.status !== 'clear' ||
          t.judgmentSnapshot?.dimensions.problem.status !== 'clear',
      }));
    const harnessSolutionWhileIdentityOpen = brewerySolutionTurns.filter(
      (t) => t.identityStillOpen,
    );
    const d4ResolvePathHolds =
      shouldBlockSolutionBeforeIdentity(emptyGaps) &&
      turned.targetGapId !== 'solution' &&
      initialProbe.firstTargetGap !== 'solution';

    const firstQ = initialProbe.firstQuestion ?? '';
    const d7RemovedConfirmYes =
      !(
        initialProbe.firstQuestionType === 'confirm' &&
        firstQ.includes('제가 이해한 사업') &&
        firstQ.includes('맞나요')
      );

    const byClass = classified.reduce<Record<string, string[]>>((acc, item) => {
      acc[item.class] = [...(acc[item.class] ?? []), item.id];
      return acc;
    }, {});

    const dump = {
      meta: {
        implementationSha: IMPLEMENTATION_SHA,
        executedSha: gitSha(),
        executedAt: new Date().toISOString(),
        officialReportUntouched: 'docs/evidence/ALABOM/DAY_8I_P0_FIX10_REVALIDATION_REPORT.md',
        note:
          'FIX-10 expected wording is not lowered. overallPass=false is preserved. R24 is BUILD_SKIP because this run did not execute pnpm build; Preview 2/2 PASS on bcf443b7 is recorded separately.',
        production: 'NOT VERIFIED',
        mergeRequest: 'none',
      },
      overallPass: reval.overallPass,
      failedR: failedR.map((c) => ({ id: c.id, expected: c.expected, actual: c.actual })),
      failedScenarios: failedScenarios.map((s) => ({
        id: s.id,
        title: s.title,
        expected: s.expected,
        actual: s.actual,
      })),
      classified,
      byClass,
      d7: {
        role: 'default first-question document-echo confirm-yes removed',
        firstQuestionType: initialProbe.firstQuestionType,
        firstTargetGap: initialProbe.firstTargetGap,
        firstQuestion: firstQ,
        confirmYesRemoved: d7RemovedConfirmYes,
        failedIds: byClass.D7_CONFIRM_YES_SURFACE ?? [],
      },
      d4: {
        role: 'solution forbidden while customer or problem still askable',
        shouldBlock: shouldBlockSolutionBeforeIdentity(emptyGaps),
        resolveTurnDecisionGap: turned.targetGapId,
        firstTargetGap: initialProbe.firstTargetGap,
        resolvePathHolds: d4ResolvePathHolds,
        brewerySolutionTurns,
        harnessSolutionWhileIdentityOpen,
        failedIds: byClass.SOLUTION_BEFORE_IDENTITY ?? [],
        note:
          'resolveTurnDecision empty-state next≠solution is the D4 unit. Brewery harness uses resolveNextQuestionDecision; solution after 「네, 맞습니다」 on the D7 customer surface is classified separately and is not rewritten to PASS.',
      },
      breweryScriptNote:
        'FIX10_BREWERY_SCENARIO first CEO answer is 「네, 맞습니다.」 written for Scenario B confirm-yes. After D7 that answer lands on a different first surface, so H/J/F2/F5 can fail without solution-before-identity regressing.',
    };

    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);

    expect(reval.overallPass).toBe(false);
    expect(d7RemovedConfirmYes).toBe(true);
    expect(d4ResolvePathHolds).toBe(true);
    expect(byClass.D7_CONFIRM_YES_SURFACE ?? []).toEqual(
      expect.arrayContaining(['B', 'FIX10-R02']),
    );
    expect(byClass.SOLUTION_BEFORE_IDENTITY ?? []).toEqual([]);
    expect(harnessSolutionWhileIdentityOpen).toEqual([]);
    expect(loadAiPmLoopState(probeProjectId).turns).toEqual([]);
  }, 180_000);
});
