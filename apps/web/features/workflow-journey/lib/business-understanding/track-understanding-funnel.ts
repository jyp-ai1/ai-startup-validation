import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
} from '@/lib/analytics/product-analytics';

export function trackBusinessUnderstandingConfirmed(projectId?: string): void {
  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.businessUnderstandingConfirmed, {
    project_id: projectId,
  });
}

export function trackBusinessUnderstandingCorrected(projectId?: string): void {
  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.businessUnderstandingCorrected, {
    project_id: projectId,
  });
}

export function trackClarityQuestionRaised(input: {
  projectId?: string;
  targetGap?: string | null;
}): void {
  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.clarityQuestionRaised, {
    project_id: input.projectId,
    question_id: input.targetGap ?? undefined,
  });
}

export function trackBlindSpotDetected(input: {
  projectId?: string;
  targetGap?: string | null;
}): void {
  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.blindSpotDetected, {
    project_id: input.projectId,
    blind_spot: input.targetGap ?? undefined,
  });
}

export function trackClarityQuestionAnswered(input: {
  projectId?: string;
  targetGap?: string | null;
  kind?: string;
}): void {
  void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.clarityQuestionAnswered, {
    project_id: input.projectId,
    question_id: input.targetGap ?? undefined,
    category: input.kind,
  });
}
