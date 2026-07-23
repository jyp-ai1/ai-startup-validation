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
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
            <Sparkles className="size-4" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-zinc-900">
            {t('nav.brand')}
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.features')}
          </a>
          <a href="#demo" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.demo')}
          </a>
          <a href="#pricing" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.pricing')}
          </a>
          <a href="#faq" className="text-sm text-zinc-600 transition-colors hover:text-zinc-900">
            {t('nav.faq')}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <TrackedThemeToggle />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/dashboard">{t('nav.signIn')}</Link>
          </Button>
          <LandingCtaLink
            href="/dashboard"
            event="cta_start"
            size="sm"
            className="h-9 rounded-xl bg-zinc-900 px-4 text-white hover:bg-zinc-800"
          >
            {t('nav.startFree')}
          </LandingCtaLink>
        </div>
      </div>
    </header>
  );
}
