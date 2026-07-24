'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ErrorPageView } from '@/components/error-page-view';
import { trackError } from '@/lib/analytics/client';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: ErrorProps) {
  const t = useTranslations('errors');

  useEffect(() => {
    trackError(error, {
      error_digest: error.digest,
      screen: typeof window !== 'undefined' ? window.location.pathname : undefined,
      status: '500',
    });
  }, [error]);

  return (
    <ErrorPageView
      code="500"
      title={t('somethingWrong')}
      description={t('tryAgain')}
      actionLabel={t('retry')}
      onRetry={reset}
      secondaryLabel={t('backToDashboard')}
      secondaryHref="/dashboard"
    />
  );
}
