'use client';

import { useEffect, useRef } from 'react';

import { getBrowserFamily } from '@/lib/analytics/browser-context';
import {
  PRODUCT_ANALYTICS_EVENTS,
  recordFunnelEvent,
  type ProductAnalyticsEvent,
  type ProductAnalyticsParams,
} from '@/lib/analytics/product-analytics';

const SESSION_PREFIX = 'll_journey_tracked_';

function sessionKey(event: string): string {
  return `${SESSION_PREFIX}${event}`;
}

/** Fire a funnel event once per browser session — Sprint 5.1.3 journey telemetry. */
export function useJourneyEventOnce(
  event: ProductAnalyticsEvent,
  params?: ProductAnalyticsParams,
  enabled = true,
): void {
  const tracked = useRef(false);

  useEffect(() => {
    if (!enabled || tracked.current || typeof window === 'undefined') return;
    const key = sessionKey(event);
    if (sessionStorage.getItem(key) === '1') return;
    tracked.current = true;
    sessionStorage.setItem(key, '1');
    void recordFunnelEvent(event, {
      ...params,
      browser: params?.browser ?? getBrowserFamily(),
    });
  }, [enabled, event, params]);
}

type JourneyPageTrackerProps = {
  event: ProductAnalyticsEvent;
  screen: string;
  projectId?: string;
  enabled?: boolean;
};

export function JourneyPageTracker({
  event,
  screen,
  projectId,
  enabled = true,
}: JourneyPageTrackerProps) {
  useJourneyEventOnce(
    event,
    { screen, project_id: projectId },
    enabled,
  );
  return null;
}

export function WorkspaceJourneyTracker({ projectId }: { projectId?: string }) {
  return (
    <JourneyPageTracker
      event={PRODUCT_ANALYTICS_EVENTS.workspaceOpen}
      screen="/workspace"
      projectId={projectId}
    />
  );
}

export function ValidationJourneyTracker({
  projectId,
  enabled = true,
}: {
  projectId?: string;
  enabled?: boolean;
}) {
  return (
    <JourneyPageTracker
      event={PRODUCT_ANALYTICS_EVENTS.validationOpen}
      screen="/validation"
      projectId={projectId}
      enabled={enabled}
    />
  );
}

export function WhoJourneyTracker({ projectId }: { projectId?: string }) {
  return (
    <JourneyPageTracker
      event={PRODUCT_ANALYTICS_EVENTS.goalSelected}
      screen="/who"
      projectId={projectId}
    />
  );
}
