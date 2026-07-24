'use client';

import { usePathname } from 'next/navigation';

type AppShellGateProps = {
  shell: React.ReactNode;
  children: React.ReactNode;
};

function isJourneyRoute(pathname: string): boolean {
  return (
    pathname === '/goal' ||
    pathname.startsWith('/goal/') ||
    pathname === '/workflow' ||
    pathname.startsWith('/workflow/') ||
    pathname === '/workspace' ||
    pathname.startsWith('/workspace/')
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

  return shell;
}
