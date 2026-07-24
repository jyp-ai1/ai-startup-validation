'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

/** Tracks successful OAuth return once — L3.4 RC analytics funnel */
export function AuthCompleteTracker() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    if (searchParams.get('auth') !== 'complete') return;

    trackEvent(ANALYTICS_EVENTS.login, { provider: 'google', screen: '/dashboard' });
    trackEvent(ANALYTICS_EVENTS.signup, { provider: 'google', screen: '/dashboard' });
    trackEvent(ANALYTICS_EVENTS.funnelStep, { step: 'login_complete', screen: '/dashboard' });

    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router, searchParams, trackEvent]);

  return null;
}
