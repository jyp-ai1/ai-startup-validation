'use client';

import { useEffect } from 'react';

import { trackError } from '@/lib/analytics/client';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    trackError(error, {
      error_digest: error.digest,
      screen: 'global',
      status: '500',
    });
  }, [error]);

  return (
    <html lang="ko">
      <body className="flex min-h-screen items-center justify-center bg-background p-6 font-sans text-foreground">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A critical error occurred. Please refresh the page.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
