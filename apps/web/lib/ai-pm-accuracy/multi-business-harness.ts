/**
 * Sprint 2 Track D — Layer A/B multi-business harness (no browser, no LLM).
 */

import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import { decideNextQuestionFromReview } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { evaluateStageReadiness } from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '@/features/workflow-journey/lib/business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';
import type { AiPmLoopTurn } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

import type { TurnEvidenceRecord } from './accuracy-evidence-types';
import {
  evaluateTurnExpect,
  snapshotFactsFromGapState,
  snapshotGapCompleteness,
} from './accuracy-turn-harness';
import {
  BUSINESS_SCENARIO_MATRIX,
  getBusinessScenario,
  type BusinessScenarioMatrixRow,
} from './business-scenario-matrix';
import {
  buildLayerAProbeTurn,
  MULTI_BUSINESS_PILOT_SCRIPTS,
  type MultiBusinessScriptTurn,
} from './multi-business-pilot-scripts';
import type { InputPerturbationType } from './input-perturbation-types';

export type MultiBusinessHarnessReport = {
  generatedAt: string;
  sprint: 'SPRINT_2';
  layerA: { businessId: string; pass: boolean; perturbation: InputPerturbationType }[];
  layerB: { businessId: string; pass: boolean; turnCount: number }[];
  passCount: number;
  failCount: number;
  bySet: Record<string, { pass: number; fail: number; minPassRate: number | null }>;
  scenarios: Array<{
    businessId: string;
    set: string;
    layer: string;
    pass: boolean;
    turns: TurnEvidenceRecord[];
  }>;
};

function livingForBusiness(biz: BusinessScenarioMatrixRow) {
  const understanding = buildBusinessUnderstanding(biz.documentText)!;
  const memory = buildConversationMemoryFromSources({
    projectId: biz.id,
    documentText: biz.documentText,
    turns: [],
    entities: null,
    previous: null,
  });
  return buildLivingUnderstandingState({
    documentText: biz.documentText,
    understanding,
    turns: [],
    memory,
  });
}

export function runScriptOnBusiness(
  biz: BusinessScenarioMatrixRow,
  script: { turns: MultiBusinessScriptTurn[] },
): { pass: boolean; turns: TurnEvidenceRecord[] } {
  setV3ReviewPipelineForTest(true);
  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<string, string | null>> = {};
  const loopTurns: AiPmLoopTurn[] = [];
  const turnRecords: TurnEvidenceRecord[] = [];
  const living = livingForBusiness(biz);

  script.turns.forEach((turn, index) => {
    const turnId = `${biz.id}-t${index + 1}`;
    const priorFacts = { ...existingFactsByKey } as Partial<Record<string, string>>;

    const { review, semantic } = buildAnswerReview({
      turnId,
      askedGapId: turn.askedGapId,
      askedQuestionText: turn.askedQuestionText,
      askedIssueId: turn.askedIssueId,
      userAnswer: turn.userAnswer,
      displayedQuestionText: turn.askedQuestionText,
      existingFactsByKey,
      priorClosedGaps: getClosedGapIds(gapState),
    });

    gapState = updateGapStateFromReview(review, gapState);
    existingFactsByKey = snapshotFactsFromGapState(gapState);

    loopTurns.push({
      issueId: turn.askedIssueId,
      answer: turn.userAnswer,
      appliedAt: turnId,
      targetGap: turn.askedGapId,
      semanticFactKey: semantic.factKey,
    });

    const stageReadiness = evaluateStageReadiness({ gapState, turns: loopTurns });
    const decision = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    const evalResult = evaluateTurnExpect(turn.expect, {
      review,
      semantic,
      gapState,
      decision,
      priorFacts,
    });

    turnRecords.push({
      scenario: `${biz.id}:${turn.perturbation}`,
      turn: index + 1,
      userInput: turn.userAnswer,
      expectedInterpretation: { factChecks: turn.expect.factChecks ?? [] },
      actualInterpretation: {
        extractedFacts: review.extractedFacts.map((f) => ({
          key: f.key,
          value: f.value,
          evidenceClass: f.evidenceClass,
          targetGap: f.targetGap,
        })),
        intent: semantic.intent,
        quality: review.semanticInterpretationRef?.quality,
      },
      expectedState: { preserveFacts: turn.expect.preserveFacts ?? {} },
      actualState: snapshotFactsFromGapState(gapState),
      expectedGap: turn.expect.gapCompleteness ?? {},
      actualGap: snapshotGapCompleteness(gapState),
      expectedNextQuestion: turn.expect.nextTargetGap
        ? { targetGapId: turn.expect.nextTargetGap, action: turn.expect.nextAction }
        : null,
      actualNextQuestion: decision
        ? {
            targetGapId: decision.targetGapId,
            action: decision.action,
            questionText: decision.questionText,
          }
        : null,
      expectedReason: null,
      actualReason: decision?.actionRationale ?? null,
      pass: evalResult.pass,
      failureTypes: evalResult.failureTypes,
      gates: ['GATE_1_UNDERSTANDING'],
    });
  });

  return { pass: turnRecords.every((t) => t.pass), turns: turnRecords };
}

export function runLayerAProbes(): MultiBusinessHarnessReport['layerA'] {
  const out: MultiBusinessHarnessReport['layerA'] = [];
  for (const biz of BUSINESS_SCENARIO_MATRIX) {
    const result = runScriptOnBusiness(biz, { turns: [buildLayerAProbeTurn(biz.exampleLabel)] });
    out.push({
      businessId: biz.id,
      pass: result.pass,
      perturbation: 'normal',
    });
  }
  return out;
}

export function runLayerBPilots(): MultiBusinessHarnessReport['layerB'] {
  return MULTI_BUSINESS_PILOT_SCRIPTS.map((pilot) => {
    const biz = getBusinessScenario(pilot.businessId)!;
    const result = runScriptOnBusiness(biz, pilot);
    return {
      businessId: pilot.businessId,
      pass: result.pass,
      turnCount: pilot.turns.length,
    };
  });
}

export function runMultiBusinessHarness(): MultiBusinessHarnessReport {
  const layerA = runLayerAProbes();
  const layerB = runLayerBPilots();

  const scenarios: MultiBusinessHarnessReport['scenarios'] = [];

  for (const biz of BUSINESS_SCENARIO_MATRIX) {
    const result = runScriptOnBusiness(biz, { turns: [buildLayerAProbeTurn(biz.exampleLabel)] });
    scenarios.push({
      businessId: biz.id,
      set: biz.set,
      layer: 'A',
      pass: result.pass,
      turns: result.turns,
    });
  }

  for (const pilot of MULTI_BUSINESS_PILOT_SCRIPTS) {
    const biz = getBusinessScenario(pilot.businessId)!;
    const result = runScriptOnBusiness(biz, pilot);
    scenarios.push({
      businessId: pilot.businessId,
      set: biz.set,
      layer: 'B',
      pass: result.pass,
      turns: result.turns,
    });
  }

  const passCount = scenarios.filter((s) => s.pass).length;
  const failCount = scenarios.length - passCount;

  const bySet: MultiBusinessHarnessReport['bySet'] = {};
  for (const set of ['development', 'regression', 'unseen'] as const) {
    const rows = scenarios.filter((s) => s.set === set);
    const pass = rows.filter((s) => s.pass).length;
    bySet[set] = {
      pass,
      fail: rows.length - pass,
      minPassRate: rows.length ? pass / rows.length : null,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'SPRINT_2',
    layerA,
    layerB,
    passCount,
    failCount,
    bySet,
    scenarios,
  };
}
