'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight, Play } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';
import { LandingHeroPreview } from './landing-hero-preview';

export function LandingHero() {
  const t = useTranslations('landing.hero');

  const bullets = [
    t('bullet1'),
    t('bullet2'),
    t('bullet3'),
    t('bullet4'),
    t('bullet5'),
  ];

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-background sm:min-h-[100vh]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.16),transparent)]" />

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-16 pt-12 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-muted-foreground">{t('eyebrow')}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
            {t('title')}
          </h1>
          <ul className="mt-8 space-y-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[15px] text-muted-foreground">
                <span className="size-1.5 shrink-0 rounded-full bg-foreground" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg font-medium text-foreground/90">{t('tagline')}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <LandingCtaLink
              href="/auth/login?next=/dashboard"
              event="cta_start"
              className="h-11 rounded-xl bg-primary px-5 text-primary-foreground hover:bg-primary/90 sm:h-12 sm:px-8"
            >
              {t('ctaStart')}
              <ArrowRight className="size-4" />
            </LandingCtaLink>
            <LandingCtaLink
              href="/demo/enter"
              event="cta_demo"
              variant="outline"
              className="h-11 rounded-xl border-border bg-background px-5 text-foreground hover:bg-muted sm:h-12 sm:px-8"
            >
              <Play className="size-4" />
              {t('ctaDemo')}
            </LandingCtaLink>
          </div>
          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-muted-foreground">
            <li>{t('ctaHint1')}</li>
            <li className="hidden sm:list-item">·</li>
            <li>{t('ctaHint2')}</li>
            <li className="hidden sm:list-item">·</li>
            <li className="font-medium text-emerald-700">{t('ctaHint3')}</li>
          </ul>
        </div>

        <div className="relative lg:pl-4">
          <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-violet-100/40 to-transparent blur-2xl" />
          <LandingHeroPreview className="relative" />
        </div>
      </div>
    </section>
  );
}
