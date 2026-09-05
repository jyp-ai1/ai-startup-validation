/**
 * PR4 — Route next-question decision: V3 review path (primary) or legacy rollback.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  decideNextQuestionFromReview,
  isNextQuestionDecision,
  type NextQuestionDecision,
} from './decide-next-question-from-review';
import { evaluateStageReadiness } from './evaluate-stage-readiness';
import type { ConversationMemory } from './conversation-memory';
import type { LivingUnderstandingState } from './living-understanding-state';
import {
  decideNextQuestion,
  type QuestionDecision,
} from './question-decision-engine';
import { createEmptyGapState, isGapAskable } from './update-gap-state-from-review';
import { isV3ReviewPipelineActive } from './v3-review-pipeline';
import {
  loadAiPmLoopState,
  patchAiPmLoopState,
} from './workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type ResolveNextQuestionInput = {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  memory: ConversationMemory | null;
  gapState?: GapKnowledgeState;
  previousQuestionText?: string | null;
  projectId?: string;
  /** When true, persist lastDecision or clear stale artifacts on null decision. Default false (read-only). */
  persistLastDecision?: boolean;
};

export function resolveNextQuestionDecision(
  input: ResolveNextQuestionInput,
): QuestionDecision | NextQuestionDecision | null {
  if (!isV3ReviewPipelineActive()) {
    return decideNextQuestion({
      living: input.living,
      turns: input.turns,
      memory: input.memory,
      previousQuestionText: input.previousQuestionText,
    });
  }

  const loop = input.projectId ? loadAiPmLoopState(input.projectId) : null;
  const gapState = input.gapState ?? loop?.gapState ?? createEmptyGapState();
  const turns = input.turns;

  const lastReviewTurn = [...turns]
    .reverse()
    .find((t) => !t.superseded && t.review);
  const lastReview = lastReviewTurn?.review ?? null;

  const stageReadiness = evaluateStageReadiness({
    gapState,
    loop: loop ?? undefined,
    turns,
  });

  const decision = decideNextQuestionFromReview({
    living: input.living,
    turns,
    memory: input.memory,
    lastReview,
    gapState,
    stageReadiness,
    previousQuestionText: input.previousQuestionText,
  });

  if (
    decision &&
    isNextQuestionDecision(decision) &&
    input.persistLastDecision === true &&
    input.projectId
  ) {
    patchAiPmLoopState({ lastDecision: decision }, input.projectId);
  } else if (input.projectId && input.persistLastDecision === true && !decision) {
    const persisted = loadAiPmLoopState(input.projectId);
    const staleGap =
      persisted.lastDecision?.targetGapId?.trim() ||
      persisted.lastDecision?.targetGap?.trim() ||
      persisted.lockedAskSurface?.targetGap?.trim() ||
      null;
    if (staleGap && !isGapAskable(staleGap, gapState)) {
      patchAiPmLoopState(
        { lastDecision: undefined, lockedAskSurface: undefined },
        input.projectId,
      );
    }
  }

  return decision;
}
