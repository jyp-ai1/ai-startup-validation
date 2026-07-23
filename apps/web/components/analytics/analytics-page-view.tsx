'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { resolveRouteEvent, screenFromPathname } from '@/lib/analytics/route-events';
import { trackEvent, trackPage } from '@/lib/analytics/client';

export function AnalyticsPageView() {
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    const screen = screenFromPathname(pathname);
    trackPage(screen, { language: locale, screen });
    const routeEvent = resolveRouteEvent(pathname);
    if (routeEvent) {
      trackEvent(routeEvent, { language: locale, screen });
    }
  }, [pathname, locale]);

  return null;
}
