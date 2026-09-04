/**
 * ALABOM v2 — Real processing pipeline after loop answer.
 * State writes complete synchronously; stages reflect actual completion.
 */

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { AnswerReview } from '@repo/types/domain/answer-review';

import { buildBusinessUnderstanding } from './build-business-understanding';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { loadConversationMemory, saveConversationMemory } from './conversation-memory-store';
import {
  buildLivingUnderstandingState,
  type LivingUnderstandingState,
} from './living-understanding-state';
import {
  selectRefinementGapAfterAnalysisReady,
  selectTopAdaptiveGap,
} from './adaptive-question-select';
import { getAnsweredTargetGaps } from './resolve-missing-field-priority';
import { resolveNextLoopIssue } from './resolve-ai-pm-priority-issue';
import type { ThinkingStageId } from './thinking-stages';
import { hasAnalysisResult } from './analysis-result-store';
import {
  hasPendingWrongSlotReask,
  resolveWrongSlotQuestionAnchor,
} from './wrong-slot-priority';
import {
  loadAiPmLoopState,
  patchAiPmLoopState,
  appendAiPmLoopTurn,
} from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId, AiPmLoopState, AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import type { ConversationMemory } from './conversation-memory';
import { buildAnswerReview, type BuildAnswerReviewInput } from './build-answer-review';
import { isV3ReviewPipelineActive } from './v3-review-pipeline';
import {
  resolveV3NextIssueAfterProcessing,
  resolveV3RefinementIssue,
} from './v3-legacy-bypass-guards';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from './update-gap-state-from-review';

export type LoopProcessingResult = {
  loop: AiPmLoopState;
  memory: ConversationMemory;
  living: LivingUnderstandingState;
  nextIssueId: AiPmLoopIssueId | null;
  /** Stages completed by real pipeline — UI must not wait on fake timers. */
  completedStages: ThinkingStageId[];
};

export type RunLoopProcessingInput = {
  projectId?: string;
  documentText: string;
  understanding: BusinessUnderstanding;
  entities?: LaunchLensDomainContext | null;
};

/**
 * Append turn with optional V3 AnswerReview when V3_REVIEW_PIPELINE is ON.
 * reviewId is unique per call; turnId aligns with turn.appliedAt.
 */
export function appendLoopTurnWithReview(
  turn: AiPmLoopTurn,
  reviewInput: Omit<BuildAnswerReviewInput, 'turnId'>,
  projectId?: string,
): AiPmLoopState {
  if (!isV3ReviewPipelineActive()) {
    return appendAiPmLoopTurn(turn, projectId);
  }

  const current = loadAiPmLoopState(projectId);
  const priorGapState = current.gapState ?? createEmptyGapState();
  const priorClosedGaps = getClosedGapIds(priorGapState);

  const turnId = turn.appliedAt;
  const { review } = buildAnswerReview({
    ...reviewInput,
    turnId,
    priorClosedGaps,
  });
  const persistedReview: AnswerReview = {
    ...review,
    turnId,
    sourceTurnId: turnId,
  };
  const gapState = updateGapStateFromReview(persistedReview, priorGapState);

  const turns = [...current.turns, { ...turn, review: persistedReview }];
  const next: AiPmLoopState = {
    ...current,
    turns,
    gapState,
    currentIssueId: current.currentIssueId,
  };
  patchAiPmLoopState(next, projectId);
  return next;
}

/**
 * Run after answer is persisted — merges Memory, rebuilds Living State, resolves next issue.
 * All synchronous; no setTimeout gate.
 */
export function runLoopAnswerProcessing(input: RunLoopProcessingInput): LoopProcessingResult {
  const loop = loadAiPmLoopState(input.projectId);
  const previous = loadConversationMemory(input.projectId);

  const memory = buildConversationMemoryFromSources({
    projectId: input.projectId ?? 'default',
    documentText: input.documentText,
    turns: loop.turns,
    entities: input.entities ?? null,
    previous,
  });
  saveConversationMemory(memory, input.projectId);

  const living = buildLivingUnderstandingState({
    documentText: input.documentText,
    understanding: input.understanding,
    entities: input.entities ?? null,
    turns: loop.turns,
    memory,
    resolvedIssueIds: getResolvedIssueIds(loop),
  });

  // PR7 B11 — V3 ON: issue from review→decide only; legacy issue spine disabled
  const nextIssueId = isV3ReviewPipelineActive()
    ? resolveV3NextIssueAfterProcessing({ loop, living, memory })
    : resolveNextLoopIssue(input.understanding, loop, {
        documentText: input.documentText,
        entities: input.entities ?? null,
        memory,
        analysisResultExists: hasAnalysisResult(input.projectId),
        turns: loop.turns,
      });

  const completedStages: ThinkingStageId[] = [
    'confirmAnswer',
    'updateUnderstanding',
    'reviewJudgment',
    'selectNextGap',
  ];

  return {
    loop,
    memory,
    living,
    nextIssueId,
    completedStages,
  };
}

/** Apply phase transition after processing — caller syncs React state. */
export function applyLoopProcessingTransition(
  result: LoopProcessingResult,
  projectId?: string,
  canComplete?: boolean,
): AiPmLoopState {
  if (canComplete && !result.nextIssueId) {
    return patchAiPmLoopState({ phase: 'complete', currentIssueId: null }, projectId);
  }
  // Loop 9g — never enter ranked issue phase while wrong-slot re-ask is pending
  if (hasPendingWrongSlotReask(result.loop.turns)) {
    const anchor = resolveWrongSlotQuestionAnchor(result.loop.turns);
    return patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId:
          anchor?.issueId ?? result.nextIssueId ?? result.loop.currentIssueId,
      },
      projectId,
    );
  }
  if (result.nextIssueId) {
    return patchAiPmLoopState(
      {
        phase: 'issue',
        currentIssueId: result.nextIssueId,
      },
      projectId,
    );
  }
  // Core Final Stabilization — never auto-complete when canComplete is false
  // (nextIssueId null while critical gaps remain must keep the loop open)
  return patchAiPmLoopState(
    {
      phase: 'answer',
      currentIssueId: result.loop.currentIssueId,
    },
    projectId,
  );
}

/**
 * Long Sprint — reopen Q loop after Analysis Ready handoff so founders can keep refining
 * (depth gaps like marketChannel / validationTestability) without starting analysis yet.
 */
export function reopenAiPmLoopForRefinement(input: RunLoopProcessingInput): AiPmLoopState {
  const loop = loadAiPmLoopState(input.projectId);
  if (loop.phase !== 'complete') return loop;

  const memory = loadConversationMemory(input.projectId);
  const living = buildLivingUnderstandingState({
    documentText: input.documentText,
    understanding: input.understanding,
    entities: input.entities ?? null,
    turns: loop.turns,
    memory,
    resolvedIssueIds: getResolvedIssueIds(loop),
  });

  // PR7 B12 — V3 ON: reopen from readiness + gapState, not rank
  const v3RefinementIssue = resolveV3RefinementIssue(loop);
  if (v3RefinementIssue) {
    return patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId: v3RefinementIssue,
      },
      input.projectId,
    );
  }

  const answeredFactGaps = getAnsweredTargetGaps(loop.turns, loop.gapState);
  const top =
    selectRefinementGapAfterAnalysisReady(living, { answeredFactGaps }) ??
    selectTopAdaptiveGap(living, { answeredFactGaps });
  const fallbackIssue =
    [...loop.turns]
      .reverse()
      .find(
        (t) =>
          !t.superseded &&
          t.intent !== 'why_meta' &&
          t.intent !== 'mid_judgment' &&
          t.intent !== 'nonsense',
      )?.issueId ?? 'market_validation';

  return patchAiPmLoopState(
    {
      phase: 'answer',
      currentIssueId: top?.issueId ?? fallbackIssue,
    },
    input.projectId,
  );
}

/** Rebuild understanding from latest document text. */
export function refreshUnderstandingFromDocument(
  documentText: string,
): BusinessUnderstanding | null {
  const trimmed = documentText.trim();
  if (trimmed.length < 8) return null;
  return buildBusinessUnderstanding(trimmed);
}
