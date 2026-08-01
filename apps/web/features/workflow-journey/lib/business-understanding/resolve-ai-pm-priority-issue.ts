import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
  type AiPmLoopState,
} from './workspace-ai-pm-loop-types';

type IssueSignal = {
  id: AiPmLoopIssueId;
  severity: number;
};

function isBroadCustomerLabel(value: string | null | undefined): boolean {
  if (!value?.trim()) return false;
  return /중소|중소기업|기업|일반|b2b|b2c|스타트업|사업자/i.test(value.trim());
}

function customerSeverity(u: BusinessUnderstanding): number {
  if (u.customer.status === 'unknown') return 95;
  if (u.customer.status === 'needs_confirmation' || u.customerMentions.length >= 2) return 90;
  if (u.customer.status === 'document' && isBroadCustomerLabel(u.customer.value)) return 92;
  if (u.customerMentions.length === 1) return 70;
  if (u.customer.status === 'document') return 20;
  return 75;
}

function problemSeverity(u: BusinessUnderstanding): number {
  if (u.problem.status === 'unknown') return 80;
  if (u.problem.status === 'needs_confirmation') return 65;
  return 25;
}

function revenueSeverity(u: BusinessUnderstanding): number {
  if (u.revenue.status === 'unknown') return 85;
  if (u.revenue.status === 'needs_confirmation') return 60;
  return 30;
}

function competitorSeverity(_u: BusinessUnderstanding): number {
  return 55;
}

function marketSeverity(u: BusinessUnderstanding): number {
  if (u.business.status === 'document' && u.customer.status !== 'document') return 50;
  return 40;
}

function signalsFor(u: BusinessUnderstanding): IssueSignal[] {
  return [
    { id: 'customer_definition', severity: customerSeverity(u) },
    { id: 'problem_definition', severity: problemSeverity(u) },
    { id: 'bm_design', severity: revenueSeverity(u) },
    { id: 'competitor_analysis', severity: competitorSeverity(u) },
    { id: 'market_validation', severity: marketSeverity(u) },
  ];
}

/** AI PM picks ONE priority — not a menu for the founder to browse. */
export function resolveAiPmPriorityIssue(
  understanding: BusinessUnderstanding,
  resolvedIssueIds: AiPmLoopIssueId[] = [],
): AiPmLoopIssueId | null {
  const resolved = new Set(resolvedIssueIds);
  const ranked = signalsFor(understanding)
    .filter((item) => !resolved.has(item.id))
    .sort((a, b) => b.severity - a.severity);

  if (ranked.length === 0) return null;

  const top = ranked[0]!;
  if (top.severity < 45) {
    const fallback = AI_PM_LOOP_ISSUE_ORDER.find((id) => !resolved.has(id));
    return fallback ?? null;
  }

  return top.id;
}

/**
 * Single source for loop UI, pause, and resume.
 * First issue: risk-based priority. After that: committed currentIssueId, then sequential order.
 */
export function resolveNextLoopIssue(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
): AiPmLoopIssueId | null {
  if (loop.phase === 'complete') return null;

  const resolvedIds = getResolvedIssueIds(loop);
  const resolved = new Set(resolvedIds);

  if (loop.currentIssueId && !resolved.has(loop.currentIssueId)) {
    return loop.currentIssueId;
  }

  if (resolved.size === 0) {
    return resolveAiPmPriorityIssue(understanding, resolvedIds);
  }

  const ranked = signalsFor(understanding)
    .filter((item) => !resolved.has(item.id))
    .sort((a, b) => b.severity - a.severity)
    .map((item) => item.id);

  return ranked[0] ?? AI_PM_LOOP_ISSUE_ORDER.find((id) => !resolved.has(id)) ?? null;
}

export function estimatePrioritySeverity(
  understanding: BusinessUnderstanding,
  issueId: AiPmLoopIssueId,
): number {
  return signalsFor(understanding).find((item) => item.id === issueId)?.severity ?? 0;
}
