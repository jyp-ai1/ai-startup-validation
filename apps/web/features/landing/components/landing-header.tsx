import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Sparkles } from 'lucide-react';

import { LandingHeaderControls } from './landing-header-controls';

const NAV_LINKS = [
  { href: '#how-it-works', key: 'howItWorks' as const },
  { href: '#ai-pm', key: 'aiPm' as const },
  { href: '#stories', key: 'stories' as const },
  { href: '#faq', key: 'faq' as const },
] as const;

export async function LandingHeader() {
  const t = await getTranslations('landing');

  return (
    <header className="sticky top-0 z-[100] border-b border-border/60 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:gap-4 sm:px-6 lg:h-[72px] lg:px-10">
        <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden />
          </div>
          <div className="min-w-0 leading-tight">
            <span className="block truncate text-[15px] font-semibold tracking-tight text-foreground">
              {t('nav.brand')}
            </span>
            <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{t('nav.tagline')}</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-7" aria-label={t('nav.menuLabel')}>
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
          navLinks={NAV_LINKS.map(({ href, key }) => ({ href, label: t(`nav.${key}`), key }))}
          labels={{
            menuLabel: t('nav.menuLabel'),
            openMenu: t('nav.openMenu'),
            closeMenu: t('nav.closeMenu'),
            signIn: t('nav.signIn'),
            startFree: t('nav.startFree'),
          }}
        />
      </div>
    </header>
  );
}
