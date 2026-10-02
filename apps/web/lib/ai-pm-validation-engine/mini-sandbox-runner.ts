/**
 * Mini Sandbox POC — 10 business × 3 behavior × 5 turns = 150 turns.
 * Validates engine wiring (ground truth, user agent, AI PM, drift, eval).
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

import {
  snapshotFactsFromGapState,
  snapshotGapCompleteness,
} from '../ai-pm-accuracy/accuracy-turn-harness';

import type { AnswerBehaviorId, BusinessScenarioContract } from './contracts';
import { evaluateTurnDeterministic } from './deterministic-evaluator';
import { generateUserAnswer } from './deterministic-user-agent';
import {
  applyGroundTruthAnswer,
  createInitialGroundTruthState,
} from './ground-truth-engine';
import {
  MINI_SANDBOX_BEHAVIORS,
  MINI_SANDBOX_BUSINESSES,
} from './mini-sandbox-businesses';

export type MiniSandboxTurnRow = {
  businessId: string;
  archetype: string;
  behavior: AnswerBehaviorId;
  turn: number;
  userInput: string;
  askedGapId: string;
  groundTruthGapAfter: Record<string, string>;
  aiGapAfter: Record<string, string>;
  evaluation: ReturnType<typeof evaluateTurnDeterministic>;
  stateDrift: boolean;
};

export type MiniSandboxPack = {
  generatedAt: string;
  sprint: 'VALIDATION_ENGINE_POC';
  matrix: { businesses: number; behaviors: number; turnsPerSession: number; totalTurns: number };
  designConstraints: string[];
  rows: MiniSandboxTurnRow[];
  engineHealth: {
    sessionsCompleted: number;
    stateDriftTurns: number;
    userAgentDeterministic: true;
  };
};

function livingFor(biz: BusinessScenarioContract) {
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

export function runMiniSandboxSession(input: {
  business: BusinessScenarioContract;
  behavior: AnswerBehaviorId;
  maxTurns?: number;
}): MiniSandboxTurnRow[] {
  setV3ReviewPipelineForTest(true);
  const maxTurns = input.maxTurns ?? 5;
  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<string, string | null>> = {};
  let groundTruth = createInitialGroundTruthState();
  const loopTurns: AiPmLoopTurn[] = [];
  const living = livingFor(input.business);
  const rows: MiniSandboxTurnRow[] = [];

  let pendingDecision = decideNextQuestionFromReview({
    living,
    turns: loopTurns,
    memory: null,
    lastReview: null,
    gapState,
    stageReadiness: evaluateStageReadiness({ gapState, turns: loopTurns }),
  });

  for (let t = 1; t <= maxTurns; t += 1) {
    const askedGapId = pendingDecision?.targetGapId ?? 'customerPersona';
    const binding = resolveGapQuestionBinding(askedGapId);
    const askedQuestionText = pendingDecision?.questionText ?? binding.questionText;
    const userInput = generateUserAnswer({
      business: input.business,
      behavior: input.behavior,
      turn: t,
      askedGapId,
    });

    groundTruth = applyGroundTruthAnswer({
      state: groundTruth,
      behavior: input.behavior,
      turn: t,
      userAnswer: userInput,
      askedGapId,
    });

    const turnId = `${input.business.id}-${input.behavior}-t${t}`;
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
    pendingDecision = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: null,
      lastReview: review,
      gapState,
      stageReadiness,
    });

    const aiGapAfter = snapshotGapCompleteness(gapState);
    const gtGapAfter = Object.fromEntries(
      Object.entries(groundTruth.gaps).map(([k, v]) => [k, v]),
    ) as Record<string, string>;

    const evaluation = evaluateTurnDeterministic({
      userAnswer: userInput,
      extractedFacts: review.extractedFacts,
      behavior: input.behavior,
      turn: t,
      groundTruthGap: gtGapAfter,
      aiGapSnapshot: aiGapAfter,
      askedGapId,
      nextTargetGap: pendingDecision?.targetGapId ?? null,
      nextQuestionText: pendingDecision?.questionText ?? null,
    });

    rows.push({
      businessId: input.business.id,
      archetype: input.business.archetype,
      behavior: input.behavior,
      turn: t,
      userInput,
      askedGapId,
      groundTruthGapAfter: gtGapAfter,
      aiGapAfter,
      evaluation,
      stateDrift: evaluation.stateDrift ?? false,
    });
  }

  return rows;
}

export function runMiniSandboxPoc(): MiniSandboxPack {
  const rows: MiniSandboxTurnRow[] = [];
  for (const business of MINI_SANDBOX_BUSINESSES) {
    for (const behavior of MINI_SANDBOX_BEHAVIORS) {
      rows.push(...runMiniSandboxSession({ business, behavior }));
    }
  }

  const stateDriftTurns = rows.filter((r) => r.stateDrift).length;

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'VALIDATION_ENGINE_POC',
    matrix: {
      businesses: MINI_SANDBOX_BUSINESSES.length,
      behaviors: MINI_SANDBOX_BEHAVIORS.length,
      turnsPerSession: 5,
      totalTurns: rows.length,
    },
    designConstraints: [
      'state_drift_logged',
      'deterministic_user_agent',
      'deterministic_l1_l3_eval',
      'cost_cap_poc_150_turns',
    ],
    rows,
    engineHealth: {
      sessionsCompleted: MINI_SANDBOX_BUSINESSES.length * MINI_SANDBOX_BEHAVIORS.length,
      stateDriftTurns,
      userAgentDeterministic: true,
    },
  };
}
