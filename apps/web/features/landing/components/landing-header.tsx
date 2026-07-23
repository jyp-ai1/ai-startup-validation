'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { LocaleSwitcher } from '@/components/locale-switcher';
import { TrackedThemeToggle } from '@/components/analytics/tracked-theme-toggle';
import { Button } from '@repo/ui';

import { LandingCtaLink } from './landing-cta-link';

export function LandingHeader() {
  const t = useTranslations('landing');

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between gap-4 px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-80">
          <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Sparkles className="size-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">{t('nav.brand')}</span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8">
          <a href="#features" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.features')}
          </a>
          <a href="#demo" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.demo')}
          </a>
          <a href="#built-for" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.builtFor')}
          </a>
          <a href="#pricing" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.pricing')}
          </a>
          <a href="#roadmap" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.roadmap')}
          </a>
          <a href="#faq" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.faq')}
          </a>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LocaleSwitcher variant="compact" />
          <TrackedThemeToggle />
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" asChild>
            <Link href="/auth/login?next=/dashboard">{t('nav.signIn')}</Link>
          </Button>
          <LandingCtaLink
            href="/auth/login?next=/dashboard"
            event="cta_start"
            size="sm"
            className="h-9 rounded-xl bg-zinc-900 px-3 text-white hover:bg-zinc-800 sm:px-4"
          >
            {t('nav.startFree')}
          </LandingCtaLink>
        </div>
      </div>
    </header>
  );
}
