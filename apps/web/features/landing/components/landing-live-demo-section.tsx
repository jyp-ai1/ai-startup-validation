'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Check } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';

const DEMO_STEPS = ['problem', 'customer', 'market', 'review', 'decision', 'memory'] as const;

export function LandingLiveDemoSection() {
  const t = useTranslations('landing.gtm.demo');

  return (
    <section id="live-demo" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('sectionTitle')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t('sectionDesc')}
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-lg">
          <article className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('cardLabel')}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{t('cardTitle')}</h3>
            <ul className="mt-5 space-y-2" role="list">
              {DEMO_STEPS.map((step) => (
                <li key={step} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {t(`steps.${step}`)}
                </li>
              ))}
            </ul>
            <LandingCtaLink
              href="/demo/enter"
              event="cta_demo"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t('openDemo')}
              <ArrowRight className="size-4" aria-hidden />
            </LandingCtaLink>
          </article>
        </div>
      </div>
    </section>
  );
}
