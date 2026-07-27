import type { NextActionKind } from './v2-next-action-engine';
import { getNextAction } from './v2-next-action-engine';
import type { NextActionContext } from './v2-next-action-engine';
import { getNextActionMeta } from './v2-next-action-meta';
import { getAllTopicStars } from './v2-topic-judgment';
import { isReviewStale } from './v2-review-dirty-state';

export type ProjectHealthStatus = 'good' | 'caution' | 'needs-attention';

export type ProjectHealth = {
  status: ProjectHealthStatus;
  healthStars: number;
  overallConfidence: number;
  biggestChangeKey: string;
  topActionKind: NextActionKind;
  topActionMinutes: number;
};

export const MOCK_REVIEW_SUMMARY = {
  leadKey: 'entryRecommended',
  caveatKey: 'pricingWeak',
  recommendationKey: 'reReviewAfterPricing',
} as const;

export function computeProjectHealth(ctx: NextActionContext): ProjectHealth | null {
  if (ctx.reviewCount === 0) return null;

  const topics = getAllTopicStars();
  const avgStars = topics.reduce((sum, t) => sum + t.stars, 0) / topics.length;
  const avgConfidence = Math.round(
    topics.reduce((sum, t) => sum + t.confidence, 0) / topics.length,
  );
  const healthStars = Math.round(avgStars);
  const stale = isReviewStale(ctx.evidence, ctx.reviewCount);

  let status: ProjectHealthStatus = 'good';
  if (stale || avgStars < 2.5) status = 'needs-attention';
  else if (avgStars < 3.5 || avgConfidence < 60) status = 'caution';

  const action = getNextAction(ctx);
  const meta = getNextActionMeta(action.kind);

  return {
    status,
    healthStars,
    overallConfidence: avgConfidence,
    biggestChangeKey: 'customerRefined',
    topActionKind: action.kind,
    topActionMinutes: meta.estimatedMinutes,
  };
}
