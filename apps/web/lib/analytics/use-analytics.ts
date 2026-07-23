'use client';

import { useCallback } from 'react';
import { useLocale } from 'next-intl';

import { trackError, trackEvent, trackPage, trackTiming } from './client';
import type { AnalyticsEventName, AnalyticsEventParams } from './types';

export function useAnalytics() {
  const locale = useLocale();

  const withDefaults = useCallback(
    (params?: AnalyticsEventParams): AnalyticsEventParams => ({
      language: locale,
      ...params,
    }),
    [locale],
  );

  return {
    trackEvent: (name: AnalyticsEventName | string, params?: AnalyticsEventParams) =>
      trackEvent(name, withDefaults(params)),
    trackPage: (screen: string, params?: AnalyticsEventParams) =>
      trackPage(screen, withDefaults({ screen, ...params })),
    trackError: (error: Error | string, params?: AnalyticsEventParams) =>
      trackError(error, withDefaults(params)),
    trackTiming: (name: string, durationMs: number, params?: AnalyticsEventParams) =>
      trackTiming(name, durationMs, withDefaults(params)),
  };
}
