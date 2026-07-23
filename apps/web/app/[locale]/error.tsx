'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { trackError } from '@/lib/analytics/client';
import { Button } from '@repo/ui';

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
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-destructive">{t('serverError')}</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t('somethingWrong')}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t('tryAgain')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>{t('retry')}</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">{t('backToDashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}
