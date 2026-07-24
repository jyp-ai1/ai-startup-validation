'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { CookieConsentBanner } from '@/components/analytics/cookie-consent-banner';
import { AnalyticsPageView } from '@/components/analytics/analytics-page-view';
import { WebVitalsReporter } from '@/components/analytics/web-vitals-reporter';

import { hasAnalyticsConsent, hasConsentDecision } from '../consent';
import { Ga4Script } from './ga4-script';

type AnalyticsProviderProps = {
  children: React.ReactNode;
};

function isMarketingPath(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const marketing = isMarketingPath(pathname);
  const [consented, setConsented] = useState(false);
  const [decided, setDecided] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

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

  useEffect(() => {
    if (decided) {
      setShowConsent(false);
      return undefined;
    }
    if (!marketing) {
      setShowConsent(true);
      return undefined;
    }
    const id = globalThis.setTimeout(() => setShowConsent(true), 3500);
    return () => globalThis.clearTimeout(id);
  }, [decided, marketing]);

  return (
    <>
      {children}
      {showConsent && !decided ? <CookieConsentBanner /> : null}
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
