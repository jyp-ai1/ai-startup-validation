'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';

import { trackEvent } from '@/lib/analytics/client';
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

  return {
    trackGoalSelected: (goalId: string) =>
      track(JOURNEY_ANALYTICS_EVENTS.goalSelected, { goal_id: goalId }),
    trackWorkflowCreated: (goalId: string, stepCount: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.workflowCreated, { goal_id: goalId, step_count: stepCount }),
    trackWorkspaceLoaded: (goalId: string, verdict?: string) =>
      track(JOURNEY_ANALYTICS_EVENTS.workspaceLoaded, { goal_id: goalId, verdict }),
    trackCoachClicked: (section: string) =>
      track(JOURNEY_ANALYTICS_EVENTS.coachClicked, { section }),
    trackConfidenceOpened: (confidenceValue: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.confidenceOpened, { confidence_value: confidenceValue }),
    trackWhyOpened: (verdict: string) =>
      track(JOURNEY_ANALYTICS_EVENTS.whyOpened, { verdict }),
    trackMockActionCompleted: (actionKey: string, newConfidence: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.mockActionCompleted, {
        action_key: actionKey,
        new_confidence: newConfidence,
      }),
    trackFeedbackSent: (sentiment: 'up' | 'down') =>
      track(JOURNEY_ANALYTICS_EVENTS.feedbackSent, { sentiment }),
    trackComposeFailed: (retryCount: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.composeFailed, { retry_count: retryCount }),
    trackComposeRetried: (attempt: number) =>
      track(JOURNEY_ANALYTICS_EVENTS.composeRetried, { attempt }),
    trackLandingViewed: () => track(JOURNEY_ANALYTICS_EVENTS.landingViewed),
  };
}
