'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { setAnalyticsConsent } from '@/lib/analytics/consent';
import { Button } from '@repo/ui';

export function CookieConsentBanner() {
  const t = useTranslations('analytics.consent');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(show, { timeout: 2500 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(show, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  function accept() {
    setAnalyticsConsent(true);
    setVisible(false);
  }

  function reject() {
    setAnalyticsConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-xl border border-border/80 bg-background/95 p-5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <p className="text-sm font-semibold">{t('title')}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={accept}>
          {t('accept')}
        </Button>
        <Button size="sm" variant="outline" onClick={reject}>
          {t('reject')}
        </Button>
      </div>
    </div>
  );
}
