import { getTranslations } from 'next-intl/server';

import { LandingHeroActions } from './landing-hero-actions';
import { LandingHeroPreviewLazy } from './landing-hero-preview-lazy';
import { LandingJourneyStrip } from './landing-journey-strip';
import { LandingLazySection } from './landing-lazy-section';

/** Server-rendered hero — h1 in initial HTML for LCP (Epic 2 perf). */
export async function LandingHero() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="relative overflow-hidden bg-background pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.16),transparent)]" />

      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 sm:gap-12 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
            {t('title')}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground md:text-lg">{t('northStar')}</p>

          <LandingLazySection minHeight={120} rootMargin="200px 0px" className="mt-8">
            <LandingJourneyStrip />
          </LandingLazySection>

          <p className="mt-6 text-lg font-medium text-foreground/90">{t('tagline')}</p>

          <LandingHeroActions
            ctaStart={t('ctaStart')}
            ctaDemo={t('ctaDemo')}
            ctaHint1={t('ctaHint1')}
            ctaHint2={t('ctaHint2')}
            ctaHint3={t('ctaHint3')}
          />
        </div>

        <LandingHeroPreviewLazy />
      </div>
    </section>
  );
}
