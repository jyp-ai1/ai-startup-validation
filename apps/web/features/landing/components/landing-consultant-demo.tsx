'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { LandingCtaLink } from './landing-cta-link';
import { LandingHeroPreview } from './landing-hero-preview';

export function LandingConsultantDemo() {
  const t = useTranslations('landing.demo');

  return (
    <section id="demo" className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="text-sm font-medium text-violet-600">{t('eyebrow')}</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
              {t('title')}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{t('desc')}</p>
            <ul className="mt-8 space-y-3 text-sm text-zinc-700">
              <li className="flex gap-2">
                <span className="font-semibold text-zinc-900">GO</span>
                {t('highlight1')}
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-zinc-900">92%</span>
                {t('highlight2')}
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-zinc-900">146</span>
                {t('highlight3')}
              </li>
            </ul>
            <LandingCtaLink
              href="/demo/enter"
              event="cta_demo"
              className="mt-10 h-12 rounded-xl bg-zinc-900 px-8 text-white hover:bg-zinc-800"
            >
              {t('cta')}
              <ArrowRight className="size-4" />
            </LandingCtaLink>
          </div>
          <div className="relative">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-tr from-violet-100/50 via-transparent to-sky-100/40 blur-3xl" />
            <LandingHeroPreview variant="demo" className="relative animate-in fade-in duration-700" />
          </div>
        </div>
      </div>
    </section>
  );
}
