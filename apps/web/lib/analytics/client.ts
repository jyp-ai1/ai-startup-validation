'use client';

import { env } from '@repo/core/env';

import { hasAnalyticsConsent } from './consent';
import type { AnalyticsEventName, AnalyticsEventParams } from './types';

const GA_ID = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

function logDevEvent(name: string, params?: AnalyticsEventParams) {
  if (process.env.NODE_ENV === 'development') {
    console.info('[Analytics Event]', name, params ?? {});
  }
}

function sendToGa4(name: string, params?: AnalyticsEventParams) {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', name, params);
}

async function sendToOpsStore(name: string, params?: AnalyticsEventParams) {
  if (typeof window === 'undefined') return;
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        params,
        timestamp: new Date().toISOString(),
      }),
      keepalive: true,
    });
  } catch {
    // Non-blocking — analytics must not break UX
  }
}

function dispatch(name: string, params?: AnalyticsEventParams) {
  if (!hasAnalyticsConsent()) return;
  logDevEvent(name, params);
  sendToGa4(name, params);
  void sendToOpsStore(name, params);
}

export function trackEvent(name: AnalyticsEventName | string, params?: AnalyticsEventParams) {
  dispatch(name, params);
}

export function trackPage(screen: string, params?: AnalyticsEventParams) {
  dispatch('page_view', { screen, ...params });
}

export function trackError(error: Error | string, params?: AnalyticsEventParams) {
  const message = typeof error === 'string' ? error : error.message;
  dispatch('error', {
    error_message: message.slice(0, 500),
    ...params,
  });
}

export function trackTiming(name: string, durationMs: number, params?: AnalyticsEventParams) {
  dispatch(name, { duration: Math.round(durationMs), ...params });
}

export function getGaMeasurementId(): string | undefined {
  return GA_ID;
}

export function isGa4Enabled(): boolean {
  return Boolean(GA_ID);
}
