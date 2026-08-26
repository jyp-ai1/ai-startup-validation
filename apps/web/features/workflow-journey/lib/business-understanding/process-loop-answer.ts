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
import { resolveNextLoopIssue } from './resolve-ai-pm-priority-issue';
import type { ThinkingStageId } from './thinking-stages';
import { hasAnalysisResult } from './analysis-result-store';
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

  const completedStages: ThinkingStageId[] = ['memory', 'business', 'nextQuestion'];

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
  return patchAiPmLoopState(
    {
      phase: result.nextIssueId ? 'issue' : 'complete',
      currentIssueId: result.nextIssueId,
    },
    projectId,
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
