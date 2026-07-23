'use client';

import { useEffect } from 'react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type DemoEntryTrackerProps = {
  enabled: boolean;
};

export function DemoEntryTracker({ enabled }: DemoEntryTrackerProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (enabled) {
      trackEvent(ANALYTICS_EVENTS.demoEnter, { screen: '/dashboard' });
    }
  }, [enabled, trackEvent]);

  return null;
}
