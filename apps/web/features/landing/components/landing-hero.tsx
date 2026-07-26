import { getTranslations } from 'next-intl/server';

import { LandingHeroActions } from './landing-hero-actions';
import { LandingHeroPreviewStatic } from './landing-hero-preview-static';
import { LandingHeroRoleCards } from './landing-hero-role-cards';

/** Server-rendered hero — h1 in initial HTML for LCP (Epic 4 perf). */
export async function LandingHero() {
  const t = await getTranslations('landing.hero');

  return (
    <section className="relative overflow-hidden bg-background pb-16 pt-12 sm:pb-20 sm:pt-16 lg:pb-28 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(120,119,198,0.16),transparent)]" />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="grid gap-10 sm:gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
            <h1 className="mt-4 whitespace-pre-line text-4xl font-semibold leading-[1.12] tracking-tight text-foreground md:text-5xl lg:text-[3.25rem]">
              {t('title')}
            </h1>
            <p className="mt-5 text-lg font-medium leading-relaxed text-foreground/90 md:text-xl">
              {t('subtitle')}
            </p>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{t('northStar')}</p>

            <LandingHeroActions
              ctaStart={t('ctaStart')}
              ctaHint1={t('ctaHint1')}
              ctaHint2={t('ctaHint2')}
              speedPromise={t('speedPromise')}
            />
          </div>

          <div>
            <LandingHeroPreviewStatic className="mx-auto max-w-md lg:max-w-none" />
          </div>
        </div>

        <LandingHeroRoleCards />
      </div>
    </section>
  );
}
