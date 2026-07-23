import type { AnalyticsConsent } from './types';

const CONSENT_KEY = 'launchlens_analytics_consent';

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AnalyticsConsent;
  } catch {
    return null;
  }
}

export function setAnalyticsConsent(analytics: boolean): AnalyticsConsent {
  const consent: AnalyticsConsent = {
    analytics,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent('analytics-consent-changed', { detail: consent }));
  }
  return consent;
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent()?.analytics === true;
}

export function hasConsentDecision(): boolean {
  return getAnalyticsConsent() !== null;
}
