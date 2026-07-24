'use client';

import { useEffect } from 'react';

import { ANALYTICS_EVENTS, JOURNEY_ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

export function LandingTracker() {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.landingView, { screen: '/' });
    trackEvent(JOURNEY_ANALYTICS_EVENTS.landingViewed, { screen: '/' });
  }, [trackEvent]);

  return null;
}
