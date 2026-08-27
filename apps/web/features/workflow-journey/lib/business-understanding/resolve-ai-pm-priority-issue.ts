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
  type AiPmLoopIssueId,
  type AiPmLoopState,
  type AiPmLoopTurn,
} from './workspace-ai-pm-loop-types';
import {
  getAnsweredTargetGaps,
  resolveNextIssueByMissingField,
} from './resolve-missing-field-priority';
import { selectTopAdaptiveGap } from './adaptive-question-select';
import {
  buildLivingUnderstandingState,
  resolveNextIssueFromLivingState,
} from './living-understanding-state';
import { criticalGapsBlockAnalysis } from './question-causality';

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

function criticalFactsLocked(memory: ConversationMemory | null | undefined): boolean {
  if (!memory) return false;
  return (
    memoryHasFact(memory, 'customer') &&
    memoryHasFact(memory, 'problem') &&
    memoryHasFact(memory, 'buyer')
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
 * Core v4: gap-level advancement — sticky currentIssueId yields when asked gap answered.
 * Core v5: do NOT walk AI_PM_LOOP_ISSUE_ORDER as hard spine when living gaps already ranked.
 * P0-2: never return null while Analysis Ready is false — keep asking Critical Gaps.
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
  const turns = options?.turns ?? loop.turns;
  const documentText = options?.documentText ?? '';

  // S17-3 / Core v4 — missing-field priority first (includes sticky-safe logic)
  const byMissing = resolveNextIssueByMissingField(understanding, loop, {
    ...options,
    turns,
  });
  if (byMissing) {
    if (byMissing === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) {
        // fall through to soft diagnosis candidates
      } else {
        return byMissing;
      }
    } else {
      return byMissing;
    }
  }

  // Soft diagnosis candidates only — never force unused issue slots via fixed spine
  const diagnosis = buildDiagnosis(understanding, resolvedIds, options);
  const softCandidates = [diagnosis.primaryIssueId, ...diagnosis.topRiskIssueIds].filter(
    (id): id is AiPmLoopIssueId => Boolean(id),
  );

  for (const id of softCandidates) {
    if (resolved.has(id)) continue;
    if (isIssueLockedInMemory(id, memory)) continue;
    if (id === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) continue;
    }
    return id;
  }

  // P0-2 — if Analysis Ready is false, force next issue from living critical gap (no early exit)
  if (documentText.trim().length >= 8) {
    const living = buildLivingUnderstandingState({
      documentText,
      understanding,
      entities: options?.entities ?? null,
      turns,
      memory,
      resolvedIssueIds: resolvedIds,
    });
    if (criticalGapsBlockAnalysis(living)) {
      const top = selectTopAdaptiveGap(living, {
        answeredFactGaps: getAnsweredTargetGaps(turns),
      });
      if (top?.issueId) return top.issueId;
      const livingIssue = resolveNextIssueFromLivingState(living, resolvedIds, new Set());
      if (livingIssue) return livingIssue;
      // Keep loop open on current issue rather than completing
      return loop.currentIssueId;
    }
  }

  // Only when Analysis Ready — allow null so loop may complete
  if (criticalFactsLocked(memory)) {
    return null;
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
