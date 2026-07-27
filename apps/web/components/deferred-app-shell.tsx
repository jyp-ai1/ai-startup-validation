'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ClientChrome } from '@/components/client-chrome';
import { AnalyticsProvider } from '@/lib/analytics/providers/analytics-provider';

const JOURNEY_PREFIXES = [
  '/who',
  '/goal',
  '/workflow',
  '/validation',
  '/investigate',
  '/conclusion',
  '/workspaces',
  '/execution',
];

function isMarketingLanding(pathname: string): boolean {
  if (pathname === '/' || pathname === '') return true;
  return !JOURNEY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

type DeferredAppShellProps = {
  children: ReactNode;
};

/** Defers analytics + chrome on marketing routes until idle — lowers Landing TBT/LCP. */
export function DeferredAppShell({ children }: DeferredAppShellProps) {
  const pathname = usePathname();
  const marketing = isMarketingLanding(pathname);
  const [ready, setReady] = useState(!marketing);

  useEffect(() => {
    if (!marketing) {
      setReady(true);
      return undefined;
    }

    let cancelled = false;
    const activate = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(activate, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const id = globalThis.setTimeout(activate, 2000);
    return () => {
      cancelled = true;
      globalThis.clearTimeout(id);
    };
  }, [marketing, pathname]);

  if (!ready) return children;

  return (
    <AnalyticsProvider>
      {children}
      <ClientChrome />
    </AnalyticsProvider>
  );
}
