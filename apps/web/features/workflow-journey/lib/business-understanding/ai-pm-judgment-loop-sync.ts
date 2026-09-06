/**
 * DAY 8-G — Loop panel judgment sync (presentation layer only).
 */

import { buildCeoJudgmentState } from './ai-pm-judgment-aggregation';
import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
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
};

export function syncJudgmentAfterAnswer(input: {
  projectId?: string;
  living: LivingUnderstandingState;
  loop: AiPmLoopState;
  forceJudgmentView?: boolean;
}): JudgmentLoopSyncResult {
  if (!isAiPmJudgmentAggregationV1Active()) {
    return {
      loop: input.loop,
      judgment: input.loop.ceoJudgment ?? buildCeoJudgmentState({
        living: input.living,
        turns: input.loop.turns,
      }),
      stop: {
        shouldStop: false,
        reason: 'continue',
        showJudgmentView: false,
        judgmentTitle: 'question',
      },
    };
  }

  const judgment = buildCeoJudgmentState({
    living: input.living,
    turns: input.loop.turns,
    prior: input.loop.ceoJudgment,
  });

  const stop = evaluateJudgmentStop({
    questionCount: judgment.questionCount,
    judgment,
    forceJudgmentView: input.forceJudgmentView,
  });

  const patch: Partial<AiPmLoopState> = { ceoJudgment: judgment };

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

  return { loop, judgment, stop };
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
