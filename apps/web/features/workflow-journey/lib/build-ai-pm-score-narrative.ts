import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import {
  buildWorkspaceReviewScore,
  type WorkspaceReviewScore,
  type WorkspaceScoreDimensionId,
} from './build-workspace-review-score';
import type { AiPmLoopIssueId } from './business-understanding/workspace-ai-pm-loop-types';
import { resolveAiPmPriorityIssue } from './business-understanding/resolve-ai-pm-priority-issue';

export type AiPmScoreNarrativeGap = {
  issueId: AiPmLoopIssueId;
  dimensionId: WorkspaceScoreDimensionId;
};

export type AiPmScoreNarrative = {
  score: WorkspaceReviewScore;
  strengths: WorkspaceScoreDimensionId[];
  gaps: AiPmScoreNarrativeGap[];
  potentialTotal: number;
  primaryGap: AiPmScoreNarrativeGap | null;
};

const ISSUE_TO_DIMENSION: Record<AiPmLoopIssueId, WorkspaceScoreDimensionId> = {
  customer_definition: 'customerClarity',
  problem_definition: 'problemDefinition',
  bm_design: 'revenueModel',
  competitor_analysis: 'execution',
  market_validation: 'marketFit',
};

const STRONG_THRESHOLD = 72;
const GAP_THRESHOLD = 68;

function dimensionScore(score: WorkspaceReviewScore, id: WorkspaceScoreDimensionId): number {
  return score.dimensions.find((item) => item.id === id)?.score ?? 0;
}

/** PM-style score: why this number, what's blocking 85+, what to fix first. */
export function buildAiPmScoreNarrative(
  understanding: BusinessUnderstanding | null | undefined,
  reviewCount: number,
  resolvedIssueIds: AiPmLoopIssueId[] = [],
): AiPmScoreNarrative | null {
  if (!understanding) return null;

  const effectiveReviewCount = Math.max(reviewCount, 1);
  const score = buildWorkspaceReviewScore(understanding, effectiveReviewCount);
  if (score.total == null) return null;

  const strengths = score.dimensions
    .filter((item) => item.score >= STRONG_THRESHOLD)
    .map((item) => item.id);

  const gapIssueIds = (
    [
      'customer_definition',
      'problem_definition',
      'bm_design',
      'competitor_analysis',
      'market_validation',
    ] as AiPmLoopIssueId[]
  ).filter((issueId) => {
    const dimensionId = ISSUE_TO_DIMENSION[issueId];
    return dimensionScore(score, dimensionId) < GAP_THRESHOLD && !resolvedIssueIds.includes(issueId);
  });

  const gaps: AiPmScoreNarrativeGap[] = gapIssueIds.map((issueId) => ({
    issueId,
    dimensionId: ISSUE_TO_DIMENSION[issueId],
  }));

  const priorityIssue = resolveAiPmPriorityIssue(understanding, resolvedIssueIds);
  const primaryGap =
    gaps.find((gap) => gap.issueId === priorityIssue) ??
    (priorityIssue
      ? { issueId: priorityIssue, dimensionId: ISSUE_TO_DIMENSION[priorityIssue] }
      : gaps[0] ?? null);

  const unresolvedGapCount = Math.max(gaps.length, primaryGap ? 1 : 0);
  const lift = Math.min(18, unresolvedGapCount * 6 + (primaryGap ? 4 : 0));
  const potentialTotal = Math.min(95, score.total + lift);

  return {
    score,
    strengths,
    gaps,
    potentialTotal,
    primaryGap,
  };
}
