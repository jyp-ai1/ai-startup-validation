'use client';

import { useTranslations } from 'next-intl';

import { LandingJourneyStripAnimated } from './landing-journey-strip-animated';

export function LandingJourneySection() {
  const t = useTranslations('landing.journeySection');

  return (
    <section id="journey" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t('desc')}</p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <LandingJourneyStripAnimated />
        </div>
      </div>
    </section>
  );
}
