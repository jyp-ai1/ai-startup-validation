import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { AlabomLogo } from '@/lib/brand/alabom-logo';
import { getServerAuthUser } from '@/lib/auth/server-auth';

import { LandingHeaderControls } from './landing-header-controls';
import { LANDING_CONTAINER } from '../lib/landing-layout';

const NAV_LINKS = [
  { href: '#how-it-works', key: 'product' as const },
  { href: '#why-alabom', key: 'whyLaunchLens' as const },
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
          className="flex min-w-0 shrink items-center transition-opacity hover:opacity-80"
          aria-label={t('nav.brand')}
        >
          <AlabomLogo withWordmark withKorean />
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
