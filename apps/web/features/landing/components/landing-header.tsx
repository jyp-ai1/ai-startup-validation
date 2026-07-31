import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

import { UserMenu } from '@/features/auth';
import { getServerAuthUser } from '@/lib/auth/server-auth';

import { LandingHeaderControls } from './landing-header-controls';
import { LANDING_CONTAINER } from '../lib/landing-layout';

const NAV_LINKS = [
  { href: '#how-it-works', key: 'product' as const },
  { href: '#why-launchlens', key: 'whyLaunchLens' as const },
  { href: '#pricing', key: 'pricing' as const },
] as const;

export async function LandingHeader() {
  const t = await getTranslations('landing');
  const user = await getServerAuthUser();

  return (
    <header className="sticky top-0 z-[100] border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className={`${LANDING_CONTAINER} flex h-16 items-center justify-between gap-3 sm:gap-4 lg:h-[72px]`}>
        <Link
          href="/"
          className="flex min-w-0 shrink items-center gap-2.5 transition-opacity hover:opacity-80"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <span className="truncate text-[15px] font-semibold tracking-tight text-foreground">
            {t('nav.brand')}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" aria-label={t('nav.menuLabel')}>
          {NAV_LINKS.map(({ href, key }) => (
            <a
              key={key}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(`nav.${key}`)}
            </a>
          ))}
        </nav>

        <LandingHeaderControls
          user={user}
          navLinks={NAV_LINKS.map(({ href, key }) => ({ href, label: t(`nav.${key}`), key }))}
          labels={{
            menuLabel: t('nav.menuLabel'),
            openMenu: t('nav.openMenu'),
            closeMenu: t('nav.closeMenu'),
            signIn: t('nav.signIn'),
            startFree: t('nav.startFree'),
            openDemo: t('nav.openDemo'),
            workspace: t('nav.workspace'),
            settings: t('nav.settings'),
          }}
        />
      </div>
    </header>
  );
}
