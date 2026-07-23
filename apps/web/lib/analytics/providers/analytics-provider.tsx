'use client';

import { useEffect, useState } from 'react';

import { CookieConsentBanner } from '@/components/analytics/cookie-consent-banner';
import { AnalyticsPageView } from '@/components/analytics/analytics-page-view';
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter';

import { hasAnalyticsConsent, hasConsentDecision } from '../consent';
import { Ga4Script } from './ga4-script';

type AnalyticsProviderProps = {
  children: React.ReactNode;
};

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [consented, setConsented] = useState(false);
  const [decided, setDecided] = useState(false);

  useEffect(() => {
    setConsented(hasAnalyticsConsent());
    setDecided(hasConsentDecision());

    function onConsentChanged() {
      setConsented(hasAnalyticsConsent());
      setDecided(hasConsentDecision());
    }

    window.addEventListener('analytics-consent-changed', onConsentChanged);
    return () => window.removeEventListener('analytics-consent-changed', onConsentChanged);
  }, []);

  return (
    <>
      {children}
      {!decided ? <CookieConsentBanner /> : null}
      <Ga4Script enabled={consented} />
      {consented ? (
        <>
          <AnalyticsPageView />
          <WebVitalsReporter />
        </>
      ) : null}
    </>
  );
}
