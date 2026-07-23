'use client';

import { useEffect } from 'react';
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';

import { trackEvent } from '@/lib/analytics/client';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';

function reportMetric(metric: Metric) {
  trackEvent(ANALYTICS_EVENTS.webVital, {
    metric_name: metric.name,
    metric_value: Math.round(metric.value),
    metric_rating: metric.rating,
    screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
  });
}

export function WebVitalsReporter() {
  useEffect(() => {
    onLCP(reportMetric);
    onCLS(reportMetric);
    onINP(reportMetric);
  }, []);

  return null;
}
