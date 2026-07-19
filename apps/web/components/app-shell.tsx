'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

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

import { LocaleSwitcher } from '@/components/locale-switcher';
import { NAV_ITEM_CONFIGS } from '@/lib/navigation';

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
  const t = useTranslations();

  return (
    <ul className={cn('space-y-1', className)}>
      {NAV_ITEM_CONFIGS.map((item) => {
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
              {t(item.labelKey)}
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
  const t = useTranslations();
  const appName = t('meta.appName');

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
                aria-label={t('shell.openMenu')}
              >
                <Menu className="size-5" />
              </Button>
              <Link href="/dashboard" className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
                  SV
                </div>
                <span className="hidden font-semibold sm:inline-block">{appName}</span>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <LocaleSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </AppHeader>
      }
      sidebar={
        <AppSidebar>
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('shell.workspace')}
          </p>
          <NavLinks pathname={pathname} />
          <p className="mt-auto px-2 pt-4 text-xs text-muted-foreground">
            {t('shell.singleUser')}
          </p>
        </AppSidebar>
      }
      footer={
        <AppFooter>
          © {new Date().getFullYear()} {appName}. {t('shell.footer')}.
        </AppFooter>
      }
    >
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-xs gap-0 p-0 sm:max-w-xs">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-left text-sm font-semibold">
              {t('shell.navigation')}
            </DialogTitle>
          </DialogHeader>
          <nav className="p-3">
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </DialogContent>
      </Dialog>
      <AppContent>{children}</AppContent>
    </AppLayout>
  );
}
