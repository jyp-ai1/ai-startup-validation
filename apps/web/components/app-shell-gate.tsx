'use client';

import { usePathname } from 'next/navigation';

import { isMarketingPath } from '@/lib/site/marketing-routes';

type AppShellGateProps = {
  shell: React.ReactNode;
  children: React.ReactNode;
};

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

export function AppShellGate({ shell, children }: AppShellGateProps) {
  const pathname = usePathname();

  if (isMarketingPath(pathname) || isAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return shell;
}
