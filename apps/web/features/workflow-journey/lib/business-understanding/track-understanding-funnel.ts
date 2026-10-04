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
