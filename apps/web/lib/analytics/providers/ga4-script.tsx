'use client';

import Script from 'next/script';

import { env } from '@repo/core/env';

import { hasAnalyticsConsent } from '../consent';

type Ga4ScriptProps = {
  enabled: boolean;
};

export function Ga4Script({ enabled }: Ga4ScriptProps) {
  const measurementId = env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (!enabled || !measurementId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}

export function isGa4Configured(): boolean {
  return Boolean(env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
}

/** Client-only check after consent banner interaction. */
export function shouldLoadGa4(): boolean {
  return isGa4Configured() && hasAnalyticsConsent();
}
