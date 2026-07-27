import type { NextActionKind } from './v2-next-action-engine';
import { getNextAction, type NextActionContext } from './v2-next-action-engine';
import { isReviewStale } from './v2-review-dirty-state';
import { getAllTopicStars } from './v2-topic-judgment';

export type DailyBriefItem = {
  id: string;
  textKey: string;
};

export type AiPmDailyBrief = {
  newFindings: DailyBriefItem[];
  warnings: DailyBriefItem[];
  todayFocusKey: string;
  ctaKind: NextActionKind;
  showBrief: boolean;
};

/** Mock daily brief — Sprint 3.4 auto-generates from real project data. */
const MOCK_NEW_FINDINGS: DailyBriefItem[] = [
  { id: 'n1', textKey: 'competitorsUp' },
  { id: 'n2', textKey: 'searchVolumeUp' },
  { id: 'n3', textKey: 'customerChanged' },
];

const MOCK_WARNINGS: DailyBriefItem[] = [
  { id: 'w1', textKey: 'pricingUnverified' },
];

export function buildAiPmDailyBrief(ctx: NextActionContext): AiPmDailyBrief {
  const action = getNextAction(ctx);

  if (ctx.reviewCount === 0) {
    return {
      newFindings: [],
      warnings: [],
      todayFocusKey: ctx.hasIdea ? 'startReview' : 'enterIdea',
      ctaKind: action.kind,
      showBrief: true,
    };
  }

  const stale = isReviewStale(ctx.evidence, ctx.reviewCount);
  const topics = getAllTopicStars();
  const lowTopics = topics.filter((t) => t.stars < 3);

  const warnings: DailyBriefItem[] = [...MOCK_WARNINGS];
  if (stale) {
    warnings.unshift({ id: 'w-stale', textKey: 'reviewStale' });
  }
  if (lowTopics.length > 0) {
    warnings.push({ id: 'w-low', textKey: 'weakTopics' });
  }

  let todayFocusKey = 'pricingOnly';
  if (stale) todayFocusKey = 'reReviewFirst';
  else if (!ctx.investigationViewed) todayFocusKey = 'continueReview';
  else if (action.kind === 'fill-pricing') todayFocusKey = 'pricingOnly';

  return {
    newFindings: MOCK_NEW_FINDINGS,
    warnings: warnings.slice(0, 2),
    todayFocusKey,
    ctaKind: action.kind,
    showBrief: true,
  };
}
