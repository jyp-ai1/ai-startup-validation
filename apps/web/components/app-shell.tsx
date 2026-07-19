'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Sparkles } from 'lucide-react';
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
import { NAV_ITEM_CONFIGS, type NavItemConfig } from '@/lib/navigation';

type AppShellProps = {
  children: React.ReactNode;
};

const NAV_GROUPS: { labelKey: 'shell.groupMain' | 'shell.groupValidation' | 'shell.groupSystem'; keys: NavItemConfig['key'][] }[] = [
  { labelKey: 'shell.groupMain', keys: ['dashboard', 'projects'] },
  {
    labelKey: 'shell.groupValidation',
    keys: ['research', 'evidence', 'competitors', 'voc', 'grants', 'validation', 'reports'],
  },
  { labelKey: 'shell.groupSystem', keys: ['settings'] },
];

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
    <div className={cn('space-y-5', className)}>
      {NAV_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t(group.labelKey)}
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEM_CONFIGS.filter((item) => group.keys.includes(item.key)).map((item) => {
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
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/60'
                        : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
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
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="size-4" />
                </div>
                <span className="hidden max-w-[220px] truncate text-sm font-semibold sm:inline-block">
                  {appName}
                </span>
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
          <NavLinks pathname={pathname} className="flex-1" />
          <p className="px-2 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            {t('shell.singleUser')}
          </p>
        </AppSidebar>
      }
      footer={
        <AppFooter>
          © {new Date().getFullYear()} {appName} · {t('shell.footer')}
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
          <nav className="max-h-[70vh] overflow-y-auto p-3">
            <NavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </DialogContent>
      </Dialog>
      <AppContent>{children}</AppContent>
    </AppLayout>
  );
}
