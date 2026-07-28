'use client';

import { useCallback } from 'react';

import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
  type ProductAnalyticsParams,
} from '@/lib/analytics/product-analytics';

/** Sprint 4.8 — record full Closed Alpha funnel events (ops store). */
export function useAlphaFunnelTracking() {
  const track = useCallback((event: (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS], params?: ProductAnalyticsParams) => {
    void recordFunnelEvent(event, params);
  }, []);

  return {
    trackLanding: () => track(PRODUCT_ANALYTICS_EVENTS.landingViewed),
    trackDemoStart: () => track(PRODUCT_ANALYTICS_EVENTS.demoStarted),
    trackSampleSelected: () => track(PRODUCT_ANALYTICS_EVENTS.sampleSelected),
    trackInvestigationStarted: () => track(PRODUCT_ANALYTICS_EVENTS.investigationStarted),
    trackInvestigationFinished: () => track(PRODUCT_ANALYTICS_EVENTS.investigationFinished),
    trackEvidenceOpened: () => track(PRODUCT_ANALYTICS_EVENTS.evidenceOpened),
    trackSmartQuestionAnswered: (category?: string) =>
      track(PRODUCT_ANALYTICS_EVENTS.smartQuestionAnswered, { category }),
    trackReviewCompleted: () => track(PRODUCT_ANALYTICS_EVENTS.reviewCompleted),
    trackStrategyChanged: (category?: string) =>
      track(PRODUCT_ANALYTICS_EVENTS.strategyChanged, { category }),
    trackMyProjectStarted: () => track(PRODUCT_ANALYTICS_EVENTS.myProjectStarted),
    trackLoginStarted: () => track(PRODUCT_ANALYTICS_EVENTS.loginStarted),
    trackMorningReportView: (projectId?: string) => {
      track(PRODUCT_ANALYTICS_EVENTS.morningReportView, { project_id: projectId });
      track(PRODUCT_ANALYTICS_EVENTS.morningReportOpen, { project_id: projectId });
    },
    trackFounderMemoWritten: (projectId?: string) =>
      track(PRODUCT_ANALYTICS_EVENTS.founderMemoWritten, { project_id: projectId }),
  };
}
