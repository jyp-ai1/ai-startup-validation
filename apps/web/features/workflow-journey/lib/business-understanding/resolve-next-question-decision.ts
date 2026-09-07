/**
 * PR4 — Route next-question decision: V3 review path (primary) or legacy rollback.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { applyQuestionPolicy, createBootstrapDecisionWithPolicy } from './ai-pm-question-policy';
import { applyNoAskPolicy } from './ai-pm-no-ask-policy';
import { applyAntiRepeatPolicy } from './ai-pm-anti-repeat-policy';
import { applyNoGapTermination } from './ai-pm-no-gap-termination';
import {
  applyJudgmentNextQuestionBinding,
  createJudgmentBoundDecision,
} from './ai-pm-judgment-next-question-binding';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';
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
  /** Phase D — when research pending, question engine must not advance. */
  researchPending?: boolean;
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

  if (input.researchPending) {
    const loop = input.projectId ? loadAiPmLoopState(input.projectId) : null;
    return loop?.lastDecision ?? null;
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

  const rawDecision =
    decideNextQuestionFromReview({
      living: input.living,
      turns,
      memory: input.memory,
      lastReview,
      gapState,
      stageReadiness,
      previousQuestionText: input.previousQuestionText,
    }) ??
    (!lastReview
      ? createBootstrapDecisionWithPolicy(gapState, stageReadiness)
      : null);

  let decision =
    rawDecision && isNextQuestionDecision(rawDecision)
      ? applyQuestionPolicy({
          decision: rawDecision,
          gapState,
          living: input.living,
          turns,
          stageReadiness,
          isBootstrap: !lastReview,
        })
      : rawDecision;

  if (decision && isNextQuestionDecision(decision)) {
    decision = applyNoAskPolicy({
      decision,
      living: input.living,
      gapState,
      turns,
      memory: input.memory,
      stageReadiness,
      judgment: loop?.ceoJudgment ?? null,
      judgmentTraces: loop?.judgmentTraces,
    });
  }

  if (decision && isNextQuestionDecision(decision)) {
    decision = applyAntiRepeatPolicy({
      decision,
      turns,
      living: input.living,
      gapState,
    });
  }

  if (
    decision &&
    isNextQuestionDecision(decision) &&
    isAiPmJudgmentFix10V1Active()
  ) {
    const judgment = loop?.ceoJudgment ?? null;
    decision = applyJudgmentNextQuestionBinding({ decision, judgment });
  } else if (
    !decision &&
    isAiPmJudgmentFix10V1Active() &&
    loop?.ceoJudgment &&
    loop.turns.filter((t) => !t.superseded).length < 7
  ) {
    decision = createJudgmentBoundDecision(loop.ceoJudgment);
  }

  if (decision && isNextQuestionDecision(decision)) {
    decision = applyAntiRepeatPolicy({
      decision,
      turns,
      living: input.living,
      gapState,
    });
  }

  if (decision && isNextQuestionDecision(decision)) {
    decision = applyNoGapTermination({
      decision,
      living: input.living,
      turns,
      gapState,
      judgment: loop?.ceoJudgment ?? null,
    });
  }

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
