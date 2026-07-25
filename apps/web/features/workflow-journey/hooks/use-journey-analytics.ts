'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';

import { trackEvent } from '@/lib/analytics/client';
import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
  trackProductEvent,
} from '@/lib/analytics/product-analytics';
import { JOURNEY_ANALYTICS_EVENTS } from '@/lib/analytics/types';
import type { AnalyticsEventParams } from '@/lib/analytics/types';

export { JOURNEY_ANALYTICS_EVENTS };

export function useJourneyAnalytics(demoMode = false) {
  const locale = useLocale();

  const track = useCallback(
    (name: string, params?: AnalyticsEventParams) => {
      const payload: AnalyticsEventParams = {
        language: locale,
        locale,
        demo_mode: demoMode,
        screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
        ...params,
      };

      if (process.env.NODE_ENV === 'development') {
        console.info('[Journey Analytics]', name, payload);
      }

      trackEvent(name, payload);
    },
    [demoMode, locale],
  );

  const funnel = useCallback(
    (event: (typeof PRODUCT_ANALYTICS_EVENTS)[keyof typeof PRODUCT_ANALYTICS_EVENTS], params?: AnalyticsEventParams) => {
      trackProductEvent(event, params);
      void recordFunnelEvent(event, params);
    },
    [],
  );

  return {
    trackGoalSelected: (goalId: string) => {
      track(JOURNEY_ANALYTICS_EVENTS.goalSelected, { goal_id: goalId });
      funnel(PRODUCT_ANALYTICS_EVENTS.goalSelected, { goal_id: goalId });
    },
    trackWorkflowCreated: (goalId: string, stepCount: number) => {
      track(JOURNEY_ANALYTICS_EVENTS.workflowCreated, { goal_id: goalId, step_count: stepCount });
      funnel(PRODUCT_ANALYTICS_EVENTS.workflowStarted, { goal_id: goalId });
    },
    trackWorkspaceLoaded: (goalId: string, verdict?: string) => {
      track(JOURNEY_ANALYTICS_EVENTS.workspaceLoaded, { goal_id: goalId, verdict });
      funnel(PRODUCT_ANALYTICS_EVENTS.workspaceEntered, { goal_id: goalId, verdict });
    },
    trackProjectCreated: (projectName: string, goalId: string) => {
      funnel(PRODUCT_ANALYTICS_EVENTS.projectCreated, {
        project_name: projectName,
        goal_id: goalId,
      });
    },
    trackAnalysisStarted: (goalId: string) => {
      funnel(PRODUCT_ANALYTICS_EVENTS.analysisStarted, { goal_id: goalId });
    },
    trackDecisionGenerated: (verdict: string, goalId: string) => {
      funnel(PRODUCT_ANALYTICS_EVENTS.decisionGenerated, { verdict, goal_id: goalId });
    },
    trackCoachClicked: (section: string) => {
      track(JOURNEY_ANALYTICS_EVENTS.coachClicked, { section });
      funnel(PRODUCT_ANALYTICS_EVENTS.coachActionClicked, { action_key: section });
    },
    trackConfidenceOpened: (confidenceValue: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.confidenceOpened, { confidence_value: confidenceValue }),
    trackWhyOpened: (verdict: string) =>
      track(JOURNEY_ANALYTICS_EVENTS.whyOpened, { verdict }),
    trackMockActionCompleted: (actionKey: string, newConfidence: number) => {
      track(JOURNEY_ANALYTICS_EVENTS.mockActionCompleted, {
        action_key: actionKey,
        new_confidence: newConfidence,
      });
      if (actionKey.startsWith('decision_')) {
        funnel(PRODUCT_ANALYTICS_EVENTS.decisionChanged, {
          action_key: actionKey,
          confidence: newConfidence,
        });
      }
    },
    trackMissingDataClicked: (itemKey: string) => {
      track(JOURNEY_ANALYTICS_EVENTS.mockActionCompleted, { action_key: `missing_${itemKey}` });
      funnel(PRODUCT_ANALYTICS_EVENTS.missingDataClicked, { action_key: itemKey });
    },
    trackFeedbackSent: (sentiment: 'up' | 'down', message?: string) => {
      track(JOURNEY_ANALYTICS_EVENTS.feedbackSent, { sentiment, message });
      funnel(PRODUCT_ANALYTICS_EVENTS.feedbackSubmitted, { sentiment, message });
    },
    trackComposeFailed: (retryCount: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.composeFailed, { retry_count: retryCount }),
    trackComposeRetried: (attempt: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.composeRetried, { attempt }),
    trackLandingViewed: () => {
      track(JOURNEY_ANALYTICS_EVENTS.landingViewed);
      funnel(PRODUCT_ANALYTICS_EVENTS.landingViewed);
    },
  };
}
