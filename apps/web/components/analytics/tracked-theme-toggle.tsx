'use client';

import { useTranslations } from 'next-intl';

import { ThemeToggle } from '@repo/ui';

import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';

export function TrackedThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('common');
  const { trackEvent } = useAnalytics();

  return (
    <ThemeToggle
      className={className}
      tooltip={t('themeToggle')}
      onThemeChange={(theme) => {
        trackEvent(ANALYTICS_EVENTS.themeChange, {
          theme,
          screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
        });
      }}
    />
  );
}
