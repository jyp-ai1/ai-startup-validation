'use client';

import { usePathname } from 'next/navigation';

type AppShellGateProps = {
  shell: React.ReactNode;
  children: React.ReactNode;
};

function isMarketingRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '';
}

export function AppShellGate({ shell, children }: AppShellGateProps) {
  const pathname = usePathname();

  if (isMarketingRoute(pathname)) {
    return <>{children}</>;
  }

  return shell;
}
