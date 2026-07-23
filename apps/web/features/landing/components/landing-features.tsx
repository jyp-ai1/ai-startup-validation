'use client';

import { useTranslations } from 'next-intl';
import {
  BarChart3,
  FileText,
  Layers,
  LineChart,
  Scale,
  Shield,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const FEATURES: { key: string; icon: LucideIcon }[] = [
  { key: 'market', icon: LineChart },
  { key: 'competition', icon: BarChart3 },
  { key: 'evidence', icon: Shield },
  { key: 'framework', icon: Layers },
  { key: 'decision', icon: Scale },
  { key: 'report', icon: FileText },
];

export function LandingFeatures() {
  const t = useTranslations('landing.features');

  return (
    <section id="features" className="bg-zinc-50/60 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{t('desc')}</p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, icon: Icon }) => (
            <article
              key={key}
              className="group rounded-[20px] border border-black/[0.06] bg-white p-7 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-shadow hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900 text-white transition-transform group-hover:scale-105">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-zinc-900">{t(`${key}.title`)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{t(`${key}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
