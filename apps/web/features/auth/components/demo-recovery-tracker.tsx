'use client';

import { useEffect, useRef } from 'react';

import { PRODUCT_ANALYTICS_EVENTS, recordFunnelEvent } from '@/lib/analytics/product-analytics';

type DemoRecoveryTrackerProps = {
  hasDemoDraft: boolean;
};

/** P0-9 — track demo draft available for recovery on login. */
export function DemoRecoveryTracker({ hasDemoDraft }: DemoRecoveryTrackerProps) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!hasDemoDraft || tracked.current) return;
    tracked.current = true;

    void recordFunnelEvent(PRODUCT_ANALYTICS_EVENTS.demoRecoveryAvailable, {
      screen: '/auth/login',
    });
  }, [hasDemoDraft]);

  return null;
}
