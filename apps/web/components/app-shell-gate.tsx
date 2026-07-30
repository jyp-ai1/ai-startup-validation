'use client';

import { usePathname } from 'next/navigation';

type AppShellGateProps = {
  shell: React.ReactNode | null;
  children: React.ReactNode;
};

function isJourneyRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/workspace') ||
    pathname === '/who' ||
    pathname.startsWith('/who/') ||
    pathname === '/goal' ||
    pathname.startsWith('/goal/') ||
    pathname === '/workflow' ||
    pathname.startsWith('/workflow/') ||
    pathname === '/validation' ||
    pathname.startsWith('/validation/') ||
    pathname === '/investigate' ||
    pathname.startsWith('/investigate/') ||
    pathname === '/conclusion' ||
    pathname.startsWith('/conclusion/') ||
    pathname === '/execution' ||
    pathname.startsWith('/execution/')
  );
}

function isMarketingRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

export function AppShellGate({ shell, children }: AppShellGateProps) {
  const pathname = usePathname();

  if (isMarketingRoute(pathname) || isAuthRoute(pathname) || isJourneyRoute(pathname)) {
    return <>{children}</>;
  }

  if (!shell) {
    return <>{children}</>;
  }

  return shell;
}
