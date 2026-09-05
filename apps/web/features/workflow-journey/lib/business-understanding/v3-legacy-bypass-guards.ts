/**
 * PR7 — Legacy bypass guards when V3_REVIEW_PIPELINE is ON.
 * Removes rank/issue-spine/legacy-decision as primary paths; V3 SoT only.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  decideNextQuestionFromReview,
  type NextQuestionDecision,
} from './decide-next-question-from-review';
import { evaluateStageReadiness, STAGE_A_REQUIRED_GAPS, STAGE_B_REQUIRED_GAPS } from './evaluate-stage-readiness';
import type { ConversationMemory } from './conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { LivingUnderstandingState } from './living-understanding-state';
import type { MissingFieldPriority } from './resolve-missing-field-priority';
import { resolveRemountAskSurface } from './resolve-remount-ask-surface';
import {
  createEmptyGapState,
  getClosedGapIds,
  isGapAskable,
} from './update-gap-state-from-review';
import { isV3ReviewPipelineActive } from './v3-review-pipeline';
import type { AiPmLoopIssueId, AiPmLoopState, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** PR7 B1/B9 — display bind from persisted decision; never live rank when V3 ON. */
export function shouldBindDisplayFromPersistedDecision(loop: AiPmLoopState): boolean {
  if (!isV3ReviewPipelineActive()) return false;
  return Boolean(
    loop.lastDecision?.questionText?.trim() || loop.lockedAskSurface?.questionText?.trim(),
  );
}

/** PR7 B1/B9 — map persisted decision to MissingFieldPriority shape for display-only. */
export function resolveV3DisplayPriority(loop: AiPmLoopState): MissingFieldPriority | null {
  if (!isV3ReviewPipelineActive()) return null;
  const persisted = resolveRemountAskSurface(loop);
  if (!persisted) return null;
  const gapState = loop.gapState ?? createEmptyGapState();
  if (!isGapAskable(persisted.targetGap, gapState)) return null;
  return {
    issueId: persisted.issueId,
    targetGap: persisted.targetGap,
    questionText: persisted.questionText,
    whyNow: persisted.whyNow,
    rationale: persisted.rationale,
    score: 0,
    missingField: 'business' as const,
  };
}

/** PR7 B6 — gap fallback from lastDecision, not live rank. */
export function resolveV3FallbackTargetGap(loop: AiPmLoopState): string | null {
  if (!isV3ReviewPipelineActive()) return null;
  const gap =
    loop.lastDecision?.targetGapId?.trim() ||
    loop.lastDecision?.targetGap?.trim() ||
    loop.lockedAskSurface?.targetGap?.trim() ||
    null;
  return gap;
}

/** PR7 B11/B20 — issue id from NextQuestionDecision, not issue spine. */
export function resolveV3IssueFromDecision(loop: AiPmLoopState): AiPmLoopIssueId | null {
  if (!isV3ReviewPipelineActive()) return null;
  return loop.lastDecision?.issueId ?? null;
}

/** PR7 B19 — CLOSED gaps from gapState; legacy turn inference is M2 fallback only. */
export function resolveV3AnsweredGaps(
  turns: AiPmLoopTurn[] | undefined,
  gapState?: GapKnowledgeState | null,
): Set<string> | null {
  if (!isV3ReviewPipelineActive()) return null;
  if (!gapState) return null;
  return new Set(getClosedGapIds(gapState));
}

/** PR7 B11 — compute next issue from review pipeline inside runLoopAnswerProcessing. */
export function resolveV3NextIssueAfterProcessing(input: {
  loop: AiPmLoopState;
  living: LivingUnderstandingState;
  memory: ConversationMemory;
}): AiPmLoopIssueId | null {
  if (!isV3ReviewPipelineActive()) return null;

  const { loop, living, memory } = input;
  const gapState = loop.gapState ?? createEmptyGapState();
  const turns = loop.turns;

  const lastReviewTurn = [...turns]
    .reverse()
    .find((t) => !t.superseded && t.review);
  const lastReview = lastReviewTurn?.review ?? null;

  const stageReadiness = evaluateStageReadiness({ gapState, loop, turns });
  const decision = decideNextQuestionFromReview({
    living,
    turns,
    memory,
    lastReview,
    gapState,
    stageReadiness,
  });

  return decision?.issueId ?? null;
}

/** PR7 B12 — refinement reopen from evaluateStageReadiness + gapState, not rank. */
export function resolveV3RefinementIssue(loop: AiPmLoopState): AiPmLoopIssueId | null {
  if (!isV3ReviewPipelineActive()) return null;

  const gapState = loop.gapState ?? createEmptyGapState();
  const readiness = evaluateStageReadiness({ gapState, loop, turns: loop.turns });

  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    if (isGapAskable(gapId, gapState)) {
      return resolveGapQuestionBinding(gapId).issueId;
    }
  }

  if (readiness.stageBAllowed) {
    for (const gapId of STAGE_B_REQUIRED_GAPS) {
      if (isGapAskable(gapId, gapState)) {
        return resolveGapQuestionBinding(gapId).issueId;
      }
    }
  }

  return loop.currentIssueId;
}

/** PR7 B4/B5/B7 — panel routes probe/clarify through review→decide, not direct reframe. */
export function resolveV3PanelDecision(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  memory: ConversationMemory | null;
  gapState?: GapKnowledgeState | null;
  previousQuestionText?: string | null;
}): NextQuestionDecision | null {
  if (!isV3ReviewPipelineActive()) return null;

  const gapState = input.gapState ?? createEmptyGapState();
  const lastReviewTurn = [...input.turns]
    .reverse()
    .find((t) => !t.superseded && t.review);
  const lastReview = lastReviewTurn?.review ?? null;

  const stageReadiness = evaluateStageReadiness({
    gapState,
    turns: input.turns,
  });

  return decideNextQuestionFromReview({
    living: input.living,
    turns: input.turns,
    memory: input.memory,
    lastReview,
    gapState,
    stageReadiness,
    previousQuestionText: input.previousQuestionText,
  });
}
