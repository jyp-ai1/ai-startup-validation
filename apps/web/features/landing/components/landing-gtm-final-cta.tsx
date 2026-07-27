'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

export function LandingGtmFinalCta() {
  const t = useTranslations('landing.gtm.finalCta');

  return (
    <section className="border-t border-border/50 bg-muted/10 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t('desc')}
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <LandingCtaLink
            href="/auth/login?next=/workspaces"
            event="cta_start"
            className="inline-flex h-11 min-w-[200px] items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {t('primary')}
            <ArrowRight className="size-4" aria-hidden />
          </LandingCtaLink>
          <LandingCtaLink
            href="/validation?demo=readonly"
            event="cta_demo"
            variant="outline"
            size="default"
            className="inline-flex h-11 min-w-[200px] items-center justify-center rounded-lg"
          >
            {t('secondary')}
          </LandingCtaLink>
        </div>
      </div>
    </section>
  );
}
