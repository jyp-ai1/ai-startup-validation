'use client';

import { useEffect, useMemo, useState } from 'react';

import { trackError } from '@/lib/analytics/client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const COPY = {
  en: {
    title: 'Something went wrong',
    description: 'A critical error occurred. Please refresh the page.',
    retry: 'Try again',
  },
  ko: {
    title: '문제가 발생했습니다',
    description: '치명적인 오류가 발생했습니다. 페이지를 새로고침해 주세요.',
    retry: '다시 시도',
  },
} as const;

function resolveLocale(): keyof typeof COPY {
  if (typeof document === 'undefined') return 'en';
  const cookie = document.cookie.match(/NEXT_LOCALE=([^;]+)/)?.[1];
  if (cookie?.startsWith('ko')) return 'ko';
  const lang = document.documentElement.lang;
  if (lang?.startsWith('ko')) return 'ko';
  return 'en';
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [locale, setLocale] = useState<keyof typeof COPY>('en');
  const copy = useMemo(() => COPY[locale], [locale]);

  useEffect(() => {
    setLocale(resolveLocale());
    trackError(error, {
      error_digest: error.digest,
      screen: 'global',
      status: '500',
    });
  }, [error]);

  return (
    <html lang={locale}>
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <main className="max-w-md text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-destructive">500</p>
          <h1 className="mt-3 text-2xl font-semibold">{copy.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{copy.description}</p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
