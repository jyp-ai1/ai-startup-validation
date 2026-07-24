'use client';

import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

export function LandingTrustedBy() {
  const t = useTranslations('landing.trusted');

  const badges = [t('badge1'), t('badge2'), t('badge3'), t('badge4')];

  const segments = [t('segment1'), t('segment2'), t('segment3'), t('segment4'), t('segment5')];

  return (
    <section className="border-y border-border/60 bg-muted/40 py-12 sm:py-16">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" aria-hidden />
            ))}
            <span className="ml-2 text-sm font-medium text-foreground">{t('rating')}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 sm:gap-x-8">
            {segments.map((seg) => (
              <span key={seg} className="text-sm font-medium text-muted-foreground">
                {seg}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2 sm:mt-10 sm:gap-3">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-border/60 bg-card px-3 py-2 text-xs font-medium text-foreground sm:px-4"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
