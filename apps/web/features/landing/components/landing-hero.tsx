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
    <section className="relative min-h-[100vh] overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.08),transparent)]" />

      <div className="mx-auto grid max-w-[1440px] gap-12 px-6 pb-20 pt-16 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-zinc-500">{t('eyebrow')}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-zinc-900 md:text-5xl lg:text-[3.25rem]">
            {t('title')}
          </h1>
          <ul className="mt-8 space-y-2.5">
            {bullets.map((item) => (
              <li key={item} className="flex items-center gap-2 text-[15px] text-zinc-600">
                <span className="size-1.5 shrink-0 rounded-full bg-zinc-900" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-lg font-medium text-zinc-800">{t('tagline')}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <LandingCtaLink
              href="/dashboard"
              event="cta_start"
              className="h-12 rounded-xl bg-zinc-900 px-8 text-white hover:bg-zinc-800"
            >
              {t('ctaStart')}
              <ArrowRight className="size-4" />
            </LandingCtaLink>
            <LandingCtaLink
              href="/dashboard"
              event="cta_demo"
              variant="outline"
              className="h-12 rounded-xl border-zinc-200 bg-white px-8 text-zinc-900 hover:bg-zinc-50"
            >
              <Play className="size-4" />
              {t('ctaDemo')}
            </LandingCtaLink>
          </div>
        </div>

        <div className="relative lg:pl-4">
          <div className="pointer-events-none absolute -inset-4 rounded-[28px] bg-gradient-to-br from-violet-100/40 to-transparent blur-2xl" />
          <LandingHeroPreview className="relative" />
        </div>
      </div>
    </section>
  );
}
