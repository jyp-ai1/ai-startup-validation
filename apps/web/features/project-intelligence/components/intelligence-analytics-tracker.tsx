'use client';

import { useEffect, useRef } from 'react';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type IntelligenceAnalyticsTrackerProps = {
  projectId: string;
  memoryCount: number;
  contextProvider: string;
};

export function IntelligenceAnalyticsTracker({
  projectId,
  memoryCount,
  contextProvider,
}: IntelligenceAnalyticsTrackerProps) {
  const { trackEvent } = useAnalytics();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    if (memoryCount > 0) {
      trackEvent(ANALYTICS_EVENTS.memoryRestore, {
        project_id: projectId,
        memory_count: memoryCount,
        screen: '/dashboard',
      });
      trackEvent(ANALYTICS_EVENTS.memorySave, {
        project_id: projectId,
        memory_count: memoryCount,
        screen: '/dashboard',
      });
    }

    trackEvent(ANALYTICS_EVENTS.contextBuild, {
      project_id: projectId,
      provider: contextProvider,
      memory_count: memoryCount,
    });
  }, [contextProvider, memoryCount, projectId, trackEvent]);

  return null;
}
