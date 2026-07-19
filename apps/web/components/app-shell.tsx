'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useState } from 'react';

import { APP_NAME } from '@repo/config/constants';
import {
  AppContent,
  AppFooter,
  AppHeader,
  AppLayout,
  AppSidebar,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ThemeToggle,
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { NAV_ITEMS } from '@/lib/navigation';

type AppShellProps = {
  children: React.ReactNode;
};

function NavLinks({
  pathname,
  onNavigate,
  className,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <ul className={cn('space-y-1', className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          pathname === item.href ||
          (item.href !== '/dashboard' && pathname.startsWith(item.href));

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AppLayout
      header={
        <AppHeader>
          <div className="flex w-full items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
              >
                <Menu className="size-5" />
              </Button>
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  SV
                </div>
                <span className="hidden font-semibold sm:inline-block">
                  {APP_NAME}
                </span>
              </Link>
            </div>
            <ThemeToggle />
          </div>
        </AppHeader>
      }
      sidebar={
        <AppSidebar>
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <NavLinks pathname={pathname} />
          <p className="mt-auto px-2 pt-4 text-xs text-muted-foreground">
            Single User · Local Workspace
          </p>
        </AppSidebar>
      }
      footer={
        <AppFooter>
          © {new Date().getFullYear()} {APP_NAME}. MVP — no auth required.
        </AppFooter>
      }
    >
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-xs gap-0 p-0 sm:max-w-xs">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-left text-sm font-semibold">
              Navigation
            </DialogTitle>
          </DialogHeader>
          <nav className="p-3">
            <NavLinks
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        </DialogContent>
      </Dialog>
      <AppContent>{children}</AppContent>
    </AppLayout>
  );
}
