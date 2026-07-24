'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';
import { LandingHeroPreview } from './landing-hero-preview';

export function LandingConsultantDemo() {
  const t = useTranslations('landing.demo');

  return (
    <section id="demo" className="py-16 sm:py-[120px]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t('desc')}</p>
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">GO</span>
                {t('highlight1')}
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">92%</span>
                {t('highlight2')}
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-foreground">146</span>
                {t('highlight3')}
              </li>
            </ul>
            <LandingCtaLink
              href="/demo/enter"
              event="cta_demo"
              className="mt-10 h-12 rounded-xl bg-primary px-6 text-primary-foreground hover:bg-primary/90 sm:px-8"
            >
              {t('cta')}
              <ArrowRight className="size-4" />
            </LandingCtaLink>
          </div>
          <div className="relative min-w-0">
            <div className="pointer-events-none absolute -inset-4 rounded-[32px] bg-gradient-to-tr from-primary/10 via-transparent to-primary/5 blur-3xl sm:-inset-6" />
            <LandingHeroPreview variant="demo" className="relative animate-in fade-in duration-700" />
          </div>
        </div>
      </div>
    </section>
  );
}
