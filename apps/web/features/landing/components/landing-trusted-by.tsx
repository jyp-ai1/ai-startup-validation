'use client';

import { useTranslations } from 'next-intl';
import { Star } from 'lucide-react';

export function LandingTrustedBy() {
  const t = useTranslations('landing.trusted');

  const badges = [
    t('badge1'),
    t('badge2'),
    t('badge3'),
    t('badge4'),
  ];

  const segments = [
    t('segment1'),
    t('segment2'),
    t('segment3'),
    t('segment4'),
    t('segment5'),
  ];

  return (
    <section className="border-y border-black/[0.05] bg-zinc-50/50 py-16">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-1 text-amber-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 fill-current" />
            ))}
            <span className="ml-2 text-sm font-medium text-zinc-600">{t('rating')}</span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {segments.map((seg) => (
              <span key={seg} className="text-sm font-medium text-zinc-500">
                {seg}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-black/[0.06] bg-white px-4 py-2 text-xs font-medium text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
