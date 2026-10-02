/**
 * Matrix-based sessions for clusters under-represented in sandbox ladder (F04, F08).
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

import { evaluateTurnDeterministic } from './deterministic-evaluator';
import {
  applyGroundTruthAnswer,
  createInitialGroundTruthState,
} from './ground-truth-engine';
import type { MiniSandboxTurnRow } from './mini-sandbox-runner';

const DEV_MATRIX_IDS = [
  'biz-01',
  'biz-02',
  'biz-03',
  'biz-04',
  'biz-05',
  'biz-06',
  'biz-07',
  'biz-08',
  'biz-09',
  'biz-10',
];

export function runMatrixCalibrationSessions(input: {
  perturbations: InputPerturbationType[];
  maxTurns?: number;
}): MiniSandboxTurnRow[] {
  setV3ReviewPipelineForTest(true);
  const rows: MiniSandboxTurnRow[] = [];
  const maxTurns = input.maxTurns ?? 5;

  for (const businessId of DEV_MATRIX_IDS) {
    const biz = getBusinessScenario(businessId);
    if (!biz) continue;

    for (const perturbation of input.perturbations) {
      let gapState = createEmptyGapState();
      let existingFactsByKey: Partial<Record<string, string | null>> = {};
      let groundTruth = createInitialGroundTruthState();
      const loopTurns: AiPmLoopTurn[] = [];
      const understanding = buildBusinessUnderstanding(biz.documentText)!;
      const memory = buildConversationMemoryFromSources({
        projectId: biz.id,
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

      for (let t = 1; t <= maxTurns; t += 1) {
        const askedGapId = pendingDecision?.targetGapId ?? 'customerPersona';
        const binding = resolveGapQuestionBinding(askedGapId);
        const askedQuestionText = pendingDecision?.questionText ?? binding.questionText;
        const userInput = userAnswerForPerturbation(perturbation, t, biz.exampleLabel);

        groundTruth = applyGroundTruthAnswer({
          state: groundTruth,
          behavior: perturbation === 'uncertainty' ? 'uncertainty' : 'normal',
          turn: t,
          userAnswer: userInput,
          askedGapId,
        });

        const turnId = `${businessId}-${perturbation}-t${t}`;
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
          behavior: perturbation,
          turn: t,
          groundTruthGap: gtGapAfter,
          aiGapSnapshot: aiGapAfter,
          askedGapId,
          nextTargetGap: pendingDecision?.targetGapId ?? null,
          nextQuestionText: pendingDecision?.questionText ?? null,
        });

        rows.push({
          businessId: biz.id,
          archetype: biz.businessType,
          behavior: perturbation as MiniSandboxTurnRow['behavior'],
          turn: t,
          userInput,
          askedGapId,
          groundTruthGapAfter: gtGapAfter,
          aiGapAfter,
          evaluation,
          stateDrift: evaluation.stateDrift ?? false,
        });
      }
    }
  }

  return rows;
}
