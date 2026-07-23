'use client';

import { usePathname } from 'next/navigation';

type AppShellGateProps = {
  shell: React.ReactNode;
  children: React.ReactNode;
};

function isMarketingRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

export function AppShellGate({ shell, children }: AppShellGateProps) {
  const pathname = usePathname();

  if (isMarketingRoute(pathname) || isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return shell;
}
