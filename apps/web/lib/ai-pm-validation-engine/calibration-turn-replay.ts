/**
 * Replays one turn to capture actual AI PM outputs for CPO Calibration evidence.
 */

import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import { decideNextQuestionFromReview } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { evaluateStageReadiness } from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import { resolveGapQuestionBinding } from '@/features/workflow-journey/lib/business-understanding/gap-question-map';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '@/features/workflow-journey/lib/business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';
import type { AiPmLoopTurn } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

import { getBusinessScenario } from '../ai-pm-accuracy/business-scenario-matrix';
import type { InputPerturbationType } from '../ai-pm-accuracy/input-perturbation-types';
import {
  snapshotFactsFromGapState,
  snapshotGapCompleteness,
} from '../ai-pm-accuracy/accuracy-turn-harness';
import { userAnswerForPerturbation } from '../ai-pm-accuracy/validation-lab-answers';

import type { AnswerBehaviorId, BusinessScenarioContract } from './contracts';
import { generateUserAnswer } from './deterministic-user-agent';
import {
  applyGroundTruthAnswer,
  createInitialGroundTruthState,
} from './ground-truth-engine';
import { highestPriorityOpenGap } from './gap-priority-evaluator';
import { questionIntentForGap } from './question-intent';
import { MINI_SANDBOX_BUSINESSES } from './mini-sandbox-businesses';
import { matrixRowToScenario } from './matrix-bridge';

export type CalibrationTurnReplay = {
  businessId: string;
  behavior: string;
  turn: number;
  userInput: string;
  askedGapId: string;
  askedQuestionText: string;
  actualFacts: Array<{ key: string; value: string; evidenceClass: string }>;
  expectedFactsHint: string;
  expectedState: Record<string, string>;
  actualState: Record<string, string>;
  expectedGaps: Record<string, string>;
  actualGaps: Record<string, string>;
  expectedQuestionIntent: string;
  actualQuestionIntent: string;
  actualNextQuestion: string | null;
  actualNextTargetGap: string | null;
  expectedPriorityGap: string | null;
  reviewRationale: string | null;
  contradictions: unknown[];
};

function resolveBusiness(businessId: string): {
  documentText: string;
  exampleLabel: string;
  sandbox?: BusinessScenarioContract;
} | null {
  const sb = MINI_SANDBOX_BUSINESSES.find((b) => b.id === businessId);
  if (sb) return { documentText: sb.documentText, exampleLabel: sb.archetype, sandbox: sb };
  const row = getBusinessScenario(businessId);
  if (row) return { documentText: row.documentText, exampleLabel: row.exampleLabel };
  return null;
}

function isMatrixPerturbation(behavior: string): behavior is InputPerturbationType {
  return ['normal', 'sparse', 'multi_fact', 'off_slot', 'contradiction', 'uncertainty', 'correction'].includes(
    behavior,
  );
}

export function replayCalibrationTurn(input: {
  businessId: string;
  behavior: string;
  turn: number;
}): CalibrationTurnReplay | null {
  setV3ReviewPipelineForTest(true);
  const biz = resolveBusiness(input.businessId);
  if (!biz) return null;

  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<string, string | null>> = {};
  let groundTruth = createInitialGroundTruthState();
  const loopTurns: AiPmLoopTurn[] = [];

  const understanding = buildBusinessUnderstanding(biz.documentText)!;
  const memory = buildConversationMemoryFromSources({
    projectId: input.businessId,
    documentText: biz.documentText,
    turns: [],
    entities: null,
    previous: null,
  });
  const living = buildLivingUnderstandingState({
    documentText: biz.documentText,
    understanding,
    turns: [],
    memory,
  });

  let pendingDecision = decideNextQuestionFromReview({
    living,
    turns: loopTurns,
    memory: null,
    lastReview: null,
    gapState,
    stageReadiness: evaluateStageReadiness({ gapState, turns: loopTurns }),
  });

  let lastReview: ReturnType<typeof buildAnswerReview>['review'] | null = null;
  let lastSemantic: ReturnType<typeof buildAnswerReview>['semantic'] | null = null;
  let lastUserInput = '';
  let lastAskedGapId = '';
  let lastAskedQuestionText = '';
  let nextQuestion: ReturnType<typeof decideNextQuestionFromReview> = null;

  for (let t = 1; t <= input.turn; t += 1) {
    const askedGapId = pendingDecision?.targetGapId ?? 'customerPersona';
    const binding = resolveGapQuestionBinding(askedGapId);
    const askedQuestionText = pendingDecision?.questionText ?? binding.questionText;

    let userInput: string;
    if (biz.sandbox && !isMatrixPerturbation(input.behavior)) {
      userInput = generateUserAnswer({
        business: biz.sandbox,
        behavior: input.behavior as AnswerBehaviorId,
        turn: t,
        askedGapId,
      });
    } else if (isMatrixPerturbation(input.behavior)) {
      userInput = userAnswerForPerturbation(input.behavior, t, biz.exampleLabel);
    } else {
      userInput = generateUserAnswer({
        business: biz.sandbox ?? matrixRowToScenario(getBusinessScenario(input.businessId)!),
        behavior: input.behavior as AnswerBehaviorId,
        turn: t,
        askedGapId,
      });
    }

    groundTruth = applyGroundTruthAnswer({
      state: groundTruth,
      behavior: (input.behavior === 'multi_fact'
        ? 'multi_fact'
        : input.behavior === 'contradiction'
          ? 'contradiction'
          : input.behavior === 'uncertainty'
            ? 'uncertainty'
            : 'normal') as AnswerBehaviorId,
      turn: t,
      userAnswer: userInput,
      askedGapId,
    });

    const turnId = `${input.businessId}-${input.behavior}-t${t}`;
    const { review, semantic } = buildAnswerReview({
      turnId,
      askedGapId,
      askedQuestionText,
      askedIssueId: binding.issueId,
      userAnswer: userInput,
      displayedQuestionText: askedQuestionText,
      existingFactsByKey,
      priorClosedGaps: getClosedGapIds(gapState),
    });

    gapState = updateGapStateFromReview(review, gapState);
    existingFactsByKey = snapshotFactsFromGapState(gapState);

    loopTurns.push({
      issueId: binding.issueId,
      answer: userInput,
      appliedAt: turnId,
      targetGap: askedGapId,
      semanticFactKey: semantic.factKey,
    });

    const stageReadiness = evaluateStageReadiness({ gapState, turns: loopTurns });
    nextQuestion = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    lastReview = review;
    lastSemantic = semantic;
    lastUserInput = userInput;
    lastAskedGapId = askedGapId;
    lastAskedQuestionText = askedQuestionText;
    pendingDecision = nextQuestion;
  }

  if (!lastReview) return null;

  const actualGaps = snapshotGapCompleteness(gapState);
  const expectedGaps = Object.fromEntries(
    Object.entries(groundTruth.gaps).map(([k, v]) => [k, v]),
  ) as Record<string, string>;

  const actualFacts = lastReview.extractedFacts.map((f) => ({
    key: String(f.key),
    value: f.value.slice(0, 200),
    evidenceClass: f.evidenceClass,
  }));

  const nextGap = nextQuestion?.targetGapId ?? null;

  return {
    businessId: input.businessId,
    behavior: input.behavior,
    turn: input.turn,
    userInput: lastUserInput,
    askedGapId: lastAskedGapId,
    askedQuestionText: lastAskedQuestionText,
    actualFacts,
    expectedFactsHint:
      input.behavior === 'multi_fact'
        ? 'Separate payer/user/problem/workaround into distinct slots'
        : input.behavior === 'uncertainty'
          ? 'WTP/pricing must not be FACT without validation'
          : 'Per cluster CPO rubric',
    expectedState: expectedGaps,
    actualState: actualGaps,
    expectedGaps,
    actualGaps: actualGaps,
    expectedQuestionIntent: questionIntentForGap(highestPriorityOpenGap(actualGaps)),
    actualQuestionIntent: questionIntentForGap(nextGap),
    actualNextQuestion: nextQuestion?.questionText ?? null,
    actualNextTargetGap: nextGap,
    expectedPriorityGap: highestPriorityOpenGap(actualGaps),
    reviewRationale: lastReview.rationale ?? lastSemantic?.intent ?? null,
    contradictions: lastReview.contradictions ?? [],
  };
}
