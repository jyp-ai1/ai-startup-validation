'use client';

import { useEffect } from 'react';

import { ANALYTICS_EVENTS, JOURNEY_ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

export function LandingTracker() {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    const fire = () => {
      trackEvent(ANALYTICS_EVENTS.landingView, { screen: '/' });
      trackEvent(JOURNEY_ANALYTICS_EVENTS.landingViewed, { screen: '/' });
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(fire, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(fire, 1200);
    return () => globalThis.clearTimeout(id);
  }, [trackEvent]);

  return null;
}
