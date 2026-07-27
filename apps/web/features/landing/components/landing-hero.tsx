import { getTranslations } from 'next-intl/server';

import { LandingHeroActions } from './landing-hero-actions';

/** GTM Hero — message over UI (Sprint 2). */
export async function LandingHero() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="border-b border-border/40 bg-background pb-16 pt-14 sm:pb-20 sm:pt-20 lg:pb-24 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium tracking-wide text-primary">{t('eyebrow')}</p>
          <h1 className="mt-4 whitespace-pre-line text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t('subtitle')}
          </p>
          <LandingHeroActions
            ctaStart={t('ctaStart')}
            ctaDemo={t('ctaDemo')}
            ctaHint1={t('ctaHint1')}
            ctaHint2={t('ctaHint2')}
          />
        </div>
      </div>
    </section>
  );
}
