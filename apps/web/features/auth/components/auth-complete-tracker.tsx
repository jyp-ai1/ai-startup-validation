'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { getBrowserFamily } from '@/lib/analytics/browser-context';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';
import { useAnalytics } from '@/lib/analytics/use-analytics';

type AuthCompleteTrackerProps = {
  screen?: string;
  projectId?: string;
  promoted?: boolean;
};

/** Tracks successful OAuth return once — Sprint 5 Epic A */
export function AuthCompleteTracker({
  screen = '/workspace',
  projectId,
  promoted = false,
}: AuthCompleteTrackerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const tracked = useRef(false);

  useEffect(() => {
    if (searchParams.get('auth') !== 'complete' || tracked.current) return;
    tracked.current = true;

    const browser = getBrowserFamily();

    trackEvent(ANALYTICS_EVENTS.login, { provider: 'google', screen, browser });
    trackEvent(ANALYTICS_EVENTS.funnelStep, { step: 'login_complete', screen, browser });

    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.oauthSuccess, {
      provider: 'google',
      screen,
      browser,
      project_id: projectId,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.googleLoginSuccess, {
      provider: 'google',
      screen,
      browser,
      project_id: projectId,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.workspaceOpen, {
      screen,
      browser,
      project_id: projectId,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.workspaceEntered, {
      screen,
      browser,
      project_id: projectId,
    });
    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.workspaceRestored, {
      screen,
      browser,
      project_id: projectId,
    });

    if (promoted) {
      void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.draftPromoted, {
        screen,
        browser,
        project_id: projectId,
        promoted: true,
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [projectId, promoted, router, screen, searchParams, trackEvent]);

  return null;
}
