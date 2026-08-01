import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  buildAiPmDynamicDiagnosis,
  estimateDynamicRiskScore,
} from './build-ai-pm-dynamic-diagnosis';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
  type AiPmLoopState,
} from './workspace-ai-pm-loop-types';

type PriorityOptions = {
  documentText?: string | null;
  entities?: LaunchLensDomainContext | null;
};

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
 * First issue: risk-based priority. After that: committed currentIssueId, then ranked gaps.
 */
export function resolveNextLoopIssue(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): AiPmLoopIssueId | null {
  if (loop.phase === 'complete') return null;

  const resolvedIds = getResolvedIssueIds(loop);
  const resolved = new Set(resolvedIds);

  if (loop.currentIssueId && !resolved.has(loop.currentIssueId)) {
    return loop.currentIssueId;
  }

  const diagnosis = buildDiagnosis(understanding, resolvedIds, options);

  if (resolved.size === 0) {
    return diagnosis.primaryIssueId;
  }

  const next = diagnosis.topRiskIssueIds.find((id) => !resolved.has(id));
  return next ?? AI_PM_LOOP_ISSUE_ORDER.find((id) => !resolved.has(id)) ?? null;
}

export function estimatePrioritySeverity(
  understanding: BusinessUnderstanding,
  issueId: AiPmLoopIssueId,
  options?: PriorityOptions,
): number {
  const diagnosis = buildDiagnosis(understanding, [], options);
  return estimateDynamicRiskScore(diagnosis, issueId);
}
