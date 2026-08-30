/**
 * ALABOM v2 — Real processing pipeline after loop answer.
 * State writes complete synchronously; stages reflect actual completion.
 */

import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

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
} from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId, AiPmLoopState } from './workspace-ai-pm-loop-types';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import type { ConversationMemory } from './conversation-memory';

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

  const nextIssueId = resolveNextLoopIssue(input.understanding, loop, {
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

  const answeredFactGaps = getAnsweredTargetGaps(loop.turns);
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
