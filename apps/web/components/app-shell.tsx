'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Bell, Menu, Search, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { OnboardingProgressBar, WorkspaceSwitcher } from '@/features/activation';
import { UserMenu } from '@/features/auth';
import type { AppAuthUser } from '@/lib/auth/server-auth';
import type { StartupProject, ValidationScore } from '@repo/types/validation';
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
} from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { TrackedThemeToggle } from '@/components/analytics/tracked-theme-toggle';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { DemoModeBadge } from '@/features/onboarding';
import { ShellBreadcrumb } from '@/components/shell/shell-breadcrumb';
import { ProjectQuickSwitch } from '@/components/workspace/project-quick-switch';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import {
  isSidebarItemActive,
  resolveSidebarHref,
  SIDEBAR_NAV_GROUPS,
} from '@/lib/sidebar-nav';

type ActiveProjectSummary = Pick<StartupProject, 'id' | 'title' | 'status' | 'updatedAt'>;

type AppShellProps = {
  children: React.ReactNode;
  activeProject?: ActiveProjectSummary | null;
  validationScore?: ValidationScore | null;
  recentProjects?: Pick<StartupProject, 'id' | 'title'>[];
  user?: AppAuthUser | null;
  demoMode?: boolean;
  userProjects?: Pick<StartupProject, 'id' | 'title'>[];
  demoProjects?: Pick<StartupProject, 'id' | 'title'>[];
  stats?: ProjectDashboardStats | null;
};

function SidebarBrand() {
  const t = useTranslations();

  return (
    <Link href="/" className="flex items-center gap-3 px-1 py-2 transition-opacity hover:opacity-80">
      <div className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      <div>
        <p className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
          {t('meta.appName')}
        </p>
        <p className="text-[11px] leading-tight text-sidebar-foreground/60">{t('meta.appTagline')}</p>
      </div>
    </Link>
  );
}

function NavLinks({
  pathname,
  projectId,
  onNavigate,
  className,
}: {
  pathname: string;
  projectId?: string | null;
  onNavigate?: () => void;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <div className={cn('space-y-7', className)}>
      {SIDEBAR_NAV_GROUPS.map((group) => (
        <div key={group.labelKey}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
            {t(group.labelKey)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const href = resolveSidebarHref(item, projectId);
              const isActive = isSidebarItemActive(pathname, href);

              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    {isActive ? (
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-sidebar-primary" />
                    ) : null}
                    <Icon className={cn('size-4 shrink-0', isActive ? 'text-sidebar-primary' : 'opacity-75')} />
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

export function AppShell({
  children,
  activeProject,
  recentProjects = [],
  user = null,
  demoMode = false,
  userProjects = [],
  demoProjects = [],
  stats = null,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations();
  const tAuth = useTranslations('auth');
  const { trackEvent } = useAnalytics();
  const appName = t('meta.appName');
  const routeProjectId = pathname.match(/\/projects\/([^/]+)/)?.[1] ?? null;
  const projectId = routeProjectId ?? activeProject?.id ?? null;
  const showOnboardingProgress =
    pathname.includes('/dashboard') && stats && activeProject && !demoMode;

  return (
    <AppLayout
      header={
        <AppHeader>
          <div className="flex w-full items-center justify-between gap-6">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label={t('shell.openMenu')}
              >
                <Menu className="size-5" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="shrink-0 lg:hidden" asChild>
                <Link href="/" aria-label={t('onboarding.home')}>
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="hidden shrink-0 gap-1.5 text-muted-foreground lg:inline-flex" asChild>
                <Link href="/">
                  <ArrowLeft className="size-4" />
                  {t('onboarding.home')}
                </Link>
              </Button>
              <div className="hidden min-w-0 lg:block">
                <ShellBreadcrumb projectTitle={activeProject?.title} projectId={projectId} />
              </div>
              <span className="truncate text-sm font-semibold lg:hidden">{appName}</span>
            </div>
            <div className="flex items-center gap-2">
              {demoMode ? <DemoModeBadge /> : null}
              <div
                className="hidden cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 md:flex"
                onClick={() =>
                  trackEvent(ANALYTICS_EVENTS.search, {
                    screen: pathname,
                    query: t('shell.searchPlaceholder'),
                  })
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    trackEvent(ANALYTICS_EVENTS.search, { screen: pathname });
                  }
                }}
              >
                <Search className="size-4 text-muted-foreground" />
                <span className="w-36 text-[13px] text-muted-foreground">{t('shell.searchPlaceholder')}</span>
              </div>
              <Button variant="ghost" size="icon-sm" className="hidden sm:inline-flex" aria-label="Notifications">
                <Bell className="size-4" />
              </Button>
              <LocaleSwitcher />
              <TrackedThemeToggle />
              {user ? (
                <UserMenu user={user} />
              ) : (
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                  <Link href="/auth/login?next=/dashboard">{tAuth('signIn')}</Link>
                </Button>
              )}
            </div>
          </div>
        </AppHeader>
      }
      sidebar={
        <AppSidebar className="gap-6 bg-sidebar text-sidebar-foreground">
          <SidebarBrand />
          <WorkspaceSwitcher
            demoMode={demoMode}
            isAuthenticated={Boolean(user)}
            activeProjectId={projectId}
            userProjects={userProjects}
            demoProjects={demoProjects}
            className="w-full"
          />
          {projectId && activeProject ? (
            <div className="space-y-3 border-b border-sidebar-border pb-6">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                {t('shell.currentProject')}
              </p>
              <Link
                href={`/projects/${activeProject.id}`}
                className="block truncate rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-3 py-2.5 text-sm font-medium text-sidebar-foreground"
              >
                {activeProject.title}
              </Link>
              {recentProjects.length > 1 ? (
                <ProjectQuickSwitch
                  projects={recentProjects}
                  activeProjectId={projectId}
                  className="px-1"
                />
              ) : null}
            </div>
          ) : null}
          <NavLinks pathname={pathname} projectId={projectId} className="flex-1" />
        </AppSidebar>
      }
      footer={
        <AppFooter className="border-border/40 text-[13px]">
          © {new Date().getFullYear()} {appName} · {t('meta.appTagline')}
        </AppFooter>
      }
    >
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-xs gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground sm:max-w-xs">
          <DialogHeader className="border-b border-sidebar-border px-4 py-3">
            <DialogTitle className="text-left text-sm font-semibold">{t('shell.navigation')}</DialogTitle>
          </DialogHeader>
          <nav className="max-h-[70vh] overflow-y-auto p-4">
            <NavLinks pathname={pathname} projectId={projectId} onNavigate={() => setMobileOpen(false)} />
          </nav>
        </DialogContent>
      </Dialog>
      <AppContent>
        {showOnboardingProgress ? (
          <div className="mb-6">
            <OnboardingProgressBar stats={stats} />
          </div>
        ) : null}
        {children}
      </AppContent>
    </AppLayout>
  );
}
