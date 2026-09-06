/**
 * DAY 8-G — Loop panel judgment sync (presentation layer only).
 */

import { buildCeoJudgmentStateWithTrace } from './ai-pm-judgment-aggregation';
import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';
import type { CeoJudgmentDimensionId, CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { JudgmentTurnTrace } from './ai-pm-judgment-trace';
import type { LivingUnderstandingState } from './living-understanding-state';
import {
  evaluateJudgmentStop,
  type JudgmentStopVerdict,
} from './ai-pm-question-budget';
import { patchAiPmLoopState } from './workspace-ai-pm-loop-store';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';

export type JudgmentLoopSyncResult = {
  loop: AiPmLoopState;
  judgment: CeoJudgmentState;
  stop: JudgmentStopVerdict;
  turnTrace?: JudgmentTurnTrace;
};

export function syncJudgmentAfterAnswer(input: {
  projectId?: string;
  living: LivingUnderstandingState;
  loop: AiPmLoopState;
  forceJudgmentView?: boolean;
  lastQuestionText?: string;
  /** Pre-answer judgment snapshot for trace baseline */
  beforeState?: CeoJudgmentState | null;
}): JudgmentLoopSyncResult {
  if (!isAiPmJudgmentAggregationV1Active()) {
    return {
      loop: input.loop,
      judgment: input.loop.ceoJudgment ?? buildCeoJudgmentStateWithTrace({
        living: input.living,
        turns: input.loop.turns,
      }).state,
      stop: {
        shouldStop: false,
        reason: 'continue',
        showJudgmentView: false,
        judgmentTitle: 'question',
      },
    };
  }

  const prior = input.loop.ceoJudgment ?? null;

  const { state: judgment, traceEntries } = buildCeoJudgmentStateWithTrace({
    living: input.living,
    turns: input.loop.turns,
    prior,
    beforeState: input.beforeState ?? prior,
    question: input.lastQuestionText,
  });

  const stop = evaluateJudgmentStop({
    questionCount: judgment.questionCount,
    judgment,
    forceJudgmentView: input.forceJudgmentView,
  });

  const actionable = input.loop.turns.filter(
    (t) =>
      !t.superseded &&
      t.intent !== 'why_meta' &&
      t.intent !== 'mid_judgment' &&
      t.intent !== 'nonsense' &&
      Boolean(t.answer?.trim()),
  );
  const last = actionable[actionable.length - 1];
  const turnTrace: JudgmentTurnTrace | undefined =
    last && traceEntries.length > 0
      ? {
          turnId: last.appliedAt,
          turnIndex: actionable.length,
          question: input.lastQuestionText ?? last.askedQuestionText ?? '',
          answer: last.answer,
          understandingOneLiner: input.living.spine.customer ?? input.living.spine.problem ?? '',
          judgmentOneLiner: judgment.oneLiner,
          dimensionEntries: traceEntries,
        }
      : undefined;

  const patch: Partial<AiPmLoopState> = {
    ceoJudgment: judgment,
    ...(turnTrace
      ? { judgmentTraces: [...(input.loop.judgmentTraces ?? []), turnTrace] }
      : {}),
  };

  if (stop.showJudgmentView) {
    patch.viewMode = 'judgment';
    patch.phase = 'answer';
    patch.judgmentViewMode = stop.judgmentTitle === 'result' ? 'result' : 'interim';
    if (input.loop.judgmentFollowUp) {
      patch.judgmentFollowUp = false;
    }
  } else if (!input.forceJudgmentView && input.loop.viewMode === 'judgment') {
    patch.viewMode = 'question';
    patch.judgmentViewMode = null;
  }

  const loop = patchAiPmLoopState(patch, input.projectId);

  return { loop, judgment, stop, turnTrace };
}

export function openJudgmentView(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState({ viewMode: 'judgment', judgmentViewMode: 'interim' }, projectId);
}

export function resumeQuestionView(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState({ viewMode: 'question', judgmentViewMode: null }, projectId);
}

export function startJudgmentFollowUp(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState(
    { viewMode: 'question', judgmentFollowUp: true },
    projectId,
  );
}

/** DAY 8-H — open 1-page business review (distinct from interim judgment view). */
export function openBusinessReview(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState(
    {
      viewMode: 'review',
      reviewDecisionShown: false,
      supplementDimensionId: null,
      judgmentFollowUp: false,
    },
    projectId,
  );
}

/** DAY 8-H — show GO / 조건부 GO / NO-GO on review screen. */
export function showBusinessReviewDecision(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState({ reviewDecisionShown: true }, projectId);
}

/** DAY 8-H — enter supplement mode for one dimension. */
export function openSupplementMode(
  dimensionId: CeoJudgmentDimensionId,
  projectId?: string,
): AiPmLoopState {
  return patchAiPmLoopState(
    {
      viewMode: 'supplement',
      supplementDimensionId: dimensionId,
      judgmentFollowUp: false,
      phase: 'answer',
    },
    projectId,
  );
}

/** DAY 8-H — return to review after supplement answer. */
export function returnToBusinessReview(projectId?: string): AiPmLoopState {
  return patchAiPmLoopState(
    {
      viewMode: 'review',
      supplementDimensionId: null,
      reviewDecisionShown: false,
      judgmentFollowUp: false,
    },
    projectId,
  );
}
