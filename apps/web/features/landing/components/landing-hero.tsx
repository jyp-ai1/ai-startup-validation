import { getTranslations } from 'next-intl/server';

import { LandingHeroActions } from './landing-hero-actions';
import { LandingHeroPreviewStatic } from './landing-hero-preview-static';
import { LandingJourneyStrip } from './landing-journey-strip';

/** Server-rendered hero — h1 in initial HTML for LCP (Epic 4 perf). */
export async function LandingHero() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="relative overflow-hidden bg-background pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.16),transparent)]" />

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:gap-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10">
        <div className="order-2 max-w-xl lg:order-1">
          <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
          <h1 className="mt-4 whitespace-pre-line text-4xl font-semibold leading-[1.12] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
            {t('title')}
          </h1>
          <p className="mt-5 text-lg font-medium leading-relaxed text-foreground/90 md:text-xl">
            {t('subtitle')}
          </p>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t('northStar')}</p>

          <div className="mt-8">
            <LandingJourneyStrip />
          </div>

          <LandingHeroActions
            ctaStart={t('ctaStart')}
            ctaHint1={t('ctaHint1')}
            ctaHint2={t('ctaHint2')}
          />
        </div>

        <div className="order-1 lg:order-2">
          <LandingHeroPreviewStatic className="mx-auto max-w-md lg:max-w-none lg:block" />
        </div>
      </div>
    </section>
  );
}
