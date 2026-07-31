import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';

import type { MarketAlignmentState, MarketCandidate } from './workspace-alignment';

/** Workshop topic ids — labels live in i18n */
export const WORKSHOP_TOPIC_IDS = [
  'market_entry',
  'revenue_model',
  'customer_acquisition',
  'partnership',
] as const;

export type WorkshopTopicId = (typeof WORKSHOP_TOPIC_IDS)[number];

export type PostReviewInsightKind =
  | 'market_entry_unclear'
  | 'revenue_unclear'
  | 'multiple_directions';

export type PostReviewWorkshopPlan = {
  insightKind: PostReviewInsightKind;
  topicId: WorkshopTopicId;
  alternateTopicIds: WorkshopTopicId[];
};

export type WorkshopAgreementState = {
  reviewRound: number;
  topicId: WorkshopTopicId;
  customLabel?: string | null;
  agreed: boolean;
};

const workshopKey = (projectId?: string): string =>
  `launchlens.decisionWorkshop.${projectId ?? 'demo'}`;

/** Insight = observation + impact only. No advice, no "가장 중요". */
export function resolvePostReviewWorkshopPlan(
  u: BusinessUnderstanding,
  alignment: MarketAlignmentState | null,
  candidates: MarketCandidate[],
): PostReviewWorkshopPlan {
  const multipleParties = candidates.length >= 2;
  const directionOpen =
    !alignment ||
    alignment.direction === 'thinking' ||
    alignment.direction === 'decide_after_review' ||
    alignment.direction === 'unset';

  if (multipleParties && directionOpen) {
    return {
      insightKind: 'multiple_directions',
      topicId: 'market_entry',
      alternateTopicIds: ['revenue_model', 'customer_acquisition'],
    };
  }

  if (multipleParties || directionOpen) {
    return {
      insightKind: 'market_entry_unclear',
      topicId: 'market_entry',
      alternateTopicIds: ['revenue_model', 'partnership'],
    };
  }

  const revenueUnclear =
    u.revenue.status === 'unknown' ||
    u.revenue.status === 'needs_confirmation' ||
    !u.revenue.value?.trim();

  if (revenueUnclear) {
    return {
      insightKind: 'revenue_unclear',
      topicId: 'revenue_model',
      alternateTopicIds: ['market_entry', 'customer_acquisition'],
    };
  }

  return {
    insightKind: 'market_entry_unclear',
    topicId: 'market_entry',
    alternateTopicIds: ['revenue_model'],
  };
}

export function loadWorkshopAgreement(projectId?: string): WorkshopAgreementState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(workshopKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkshopAgreementState;
  } catch {
    return null;
  }
}

export function saveWorkshopAgreement(state: WorkshopAgreementState, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(workshopKey(projectId), JSON.stringify(state));
}

export function shouldShowPostReviewWorkshop(
  reviewCount: number,
  agreement: WorkshopAgreementState | null,
): boolean {
  if (reviewCount < 1) return false;
  if (!agreement) return true;
  if (agreement.reviewRound !== reviewCount) return true;
  return !agreement.agreed;
}

/** Banned in insight copy — Zero Lie / no premature judgment */
export const INSIGHT_FORBIDDEN_PATTERNS = [
  /가장 중요/,
  /추천/,
  /해야 합니다/,
  /해야 한다/,
  /문제입니다/,
] as const;

export function insightCopyIsDiscovery(text: string): boolean {
  return !INSIGHT_FORBIDDEN_PATTERNS.some((p) => p.test(text));
}
