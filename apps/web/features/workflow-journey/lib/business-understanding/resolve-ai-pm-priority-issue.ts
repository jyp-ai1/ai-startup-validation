import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  buildAiPmDynamicDiagnosis,
  estimateDynamicRiskScore,
} from './build-ai-pm-dynamic-diagnosis';
import { factKeyForIssue } from './build-conversation-memory';
import { memoryHasFact, type ConversationMemory } from './conversation-memory';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
  type AiPmLoopState,
  type AiPmLoopTurn,
} from './workspace-ai-pm-loop-types';
import { resolveNextIssueByMissingField } from './resolve-missing-field-priority';

type PriorityOptions = {
  documentText?: string | null;
  entities?: LaunchLensDomainContext | null;
  /** S9 — skip issues already locked as confirmed Facts */
  memory?: ConversationMemory | null;
  /** S14 — defer competitor until Engine analysisResult exists */
  analysisResultExists?: boolean;
  /** S17-3 — loop turns for Shared Understanding spine */
  turns?: AiPmLoopTurn[];
};

function isIssueLockedInMemory(
  issueId: AiPmLoopIssueId,
  memory: ConversationMemory | null | undefined,
): boolean {
  if (!memory) return false;
  const key = factKeyForIssue(issueId);
  return key ? memoryHasFact(memory, key) : false;
}

function buildDiagnosis(
  understanding: BusinessUnderstanding,
  resolvedIssueIds: AiPmLoopIssueId[],
  options?: PriorityOptions,
) {
  return buildAiPmDynamicDiagnosis(
    understanding,
    options?.entities,
    options?.documentText,
    resolvedIssueIds,
  );
}

/** AI PM picks ONE priority — not a menu for the founder to browse. */
export function resolveAiPmPriorityIssue(
  understanding: BusinessUnderstanding,
  resolvedIssueIds: AiPmLoopIssueId[] = [],
  options?: PriorityOptions,
): AiPmLoopIssueId | null {
  return buildDiagnosis(understanding, resolvedIssueIds, options).primaryIssueId;
}

/**
 * Single source for loop UI, pause, and resume.
 * S9: never re-ask an issue whose Fact is Confirmed in Conversation Memory.
 * S17-3: highest-priority missing Shared Understanding field drives next ask.
 */
export function resolveNextLoopIssue(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): AiPmLoopIssueId | null {
  if (loop.phase === 'complete') return null;

  const resolvedIds = getResolvedIssueIds(loop);
  const resolved = new Set(resolvedIds);
  const memory = options?.memory ?? null;

  if (
    loop.currentIssueId &&
    !resolved.has(loop.currentIssueId) &&
    !isIssueLockedInMemory(loop.currentIssueId, memory)
  ) {
    return loop.currentIssueId;
  }

  // S17-3 — missing-field priority first
  const byMissing = resolveNextIssueByMissingField(understanding, loop, {
    ...options,
    turns: options?.turns ?? loop.turns,
  });
  if (byMissing) {
    if (byMissing === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) {
        // fall through to diagnosis candidates
      } else {
        return byMissing;
      }
    } else {
      return byMissing;
    }
  }

  const diagnosis = buildDiagnosis(understanding, resolvedIds, options);
  const candidates =
    resolved.size === 0
      ? ([diagnosis.primaryIssueId, ...diagnosis.topRiskIssueIds, ...AI_PM_LOOP_ISSUE_ORDER].filter(
          Boolean,
        ) as AiPmLoopIssueId[])
      : [...diagnosis.topRiskIssueIds, ...AI_PM_LOOP_ISSUE_ORDER];

  for (const id of candidates) {
    if (resolved.has(id)) continue;
    if (isIssueLockedInMemory(id, memory)) continue;
    // S14 / v2 — competitor after analysis OR once customer+problem confirmed
    if (id === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) continue;
    }
    return id;
  }

  return null;
}

export function estimatePrioritySeverity(
  understanding: BusinessUnderstanding,
  issueId: AiPmLoopIssueId,
  options?: PriorityOptions,
): number {
  const diagnosis = buildDiagnosis(understanding, [], options);
  return estimateDynamicRiskScore(diagnosis, issueId);
}
