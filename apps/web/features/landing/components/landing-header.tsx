'use client';

import Link from 'next/link';
import { Menu, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { TrackedThemeToggle } from '@/components/analytics/tracked-theme-toggle';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { LandingCtaLink } from './landing-cta-link';

const NAV_LINKS = [
  { href: '#features', key: 'features' as const },
  { href: '#how-it-works', key: 'howItWorks' as const },
  { href: '#pricing', key: 'pricing' as const },
  { href: '#faq', key: 'faq' as const },
] as const;

export function LandingHeader() {
  const t = useTranslations('landing');
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md transition-shadow duration-200',
          scrolled && 'shadow-[0_4px_24px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.45)]',
        )}
      >
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

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              aria-label={t('nav.openMenu')}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <LocaleSwitcher />
            <TrackedThemeToggle />
            <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
              <Link href="/auth/login?next=/dashboard">{t('nav.signIn')}</Link>
            </Button>
            <LandingCtaLink
              href="/auth/login?next=/dashboard"
              event="cta_start"
              size="sm"
              className="h-9 rounded-xl bg-primary px-3 text-primary-foreground hover:bg-primary/90 sm:px-4"
            >
              {t('nav.startFree')}
            </LandingCtaLink>
          </div>
        </div>
      </header>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-sm">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/60 px-4 py-3">
            <DialogTitle className="text-base">{t('nav.menuLabel')}</DialogTitle>
            <Button variant="ghost" size="icon-sm" aria-label={t('nav.closeMenu')} onClick={closeMobile}>
              <X className="size-4" />
            </Button>
          </DialogHeader>
          <nav className="flex flex-col p-2" aria-label={t('nav.menuLabel')}>
            {NAV_LINKS.map(({ href, key }) => (
              <a
                key={key}
                href={href}
                className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                onClick={closeMobile}
              >
                {t(`nav.${key}`)}
              </a>
            ))}
            <Link
              href="/auth/login?next=/dashboard"
              className="mt-2 rounded-lg px-3 py-3 text-sm text-muted-foreground hover:bg-muted"
              onClick={closeMobile}
            >
              {t('nav.signIn')}
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
    </>
  );
}
