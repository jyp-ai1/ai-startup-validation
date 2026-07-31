'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { AppAuthUser } from '@/lib/auth/server-auth';
import { isAuthenticatedAppUser } from '@/lib/auth/app-auth';
import { signOutAndRedirect } from '@/lib/auth/client-sign-out';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type JourneyGlobalNavProps = {
  user?: AppAuthUser | null;
  guestDemoMode?: boolean;
};

const PUBLIC_LINKS = [
  { href: '/#how-it-works', key: 'product' as const },
  { href: '/#pricing', key: 'pricing' as const },
  { href: '/#why-launchlens', key: 'whyLaunchLens' as const },
] as const;

const AUTH_LINKS = [
  { href: '/workspace', key: 'workspace' as const },
  { href: '/settings', key: 'settings' as const },
] as const;

export function JourneyGlobalNav({ user = null, guestDemoMode = false }: JourneyGlobalNavProps) {
  const pathname = usePathname();
  const t = useTranslations('workflow.journey.globalNav');
  const tDemo = useTranslations('workflow.journey.workspaceShell.demo');

  const authenticated = isAuthenticatedAppUser(user);
  const links = guestDemoMode ? [] : authenticated ? AUTH_LINKS : PUBLIC_LINKS;

  return (
    <nav
      className="flex flex-wrap items-center justify-end gap-1 sm:gap-2"
      aria-label={t('label')}
    >
      {guestDemoMode ? (
        <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary sm:text-sm">
          {tDemo('guidedBannerTitle')}
        </span>
      ) : null}
      {links.map(({ href, key }) => {
        const active = href.startsWith('/#') ? false : pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-sm',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {t(key)}
          </Link>
        );
      })}
      {guestDemoMode ? (
        <Button size="sm" className="h-8 px-2.5 text-xs sm:text-sm" asChild>
          <Link href="/auth/login?next=%2Fworkspace%3Ffrom%3Ddemo%26promote%3D1">{t('login')}</Link>
        </Button>
      ) : !authenticated ? (
        <>
          <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs sm:text-sm" asChild>
            <Link href="/demo/enter">{t('openDemo')}</Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs sm:text-sm" asChild>
            <Link href="/auth/login?next=/workspace">{t('login')}</Link>
          </Button>
          <Button size="sm" className="h-8 px-2.5 text-xs sm:text-sm" asChild>
            <Link href="/auth/login?next=/workspace">{t('start')}</Link>
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 text-xs sm:text-sm"
          onClick={() => void signOutAndRedirect('/')}
        >
          {t('logout')}
        </Button>
      )}
    </nav>
  );
}
