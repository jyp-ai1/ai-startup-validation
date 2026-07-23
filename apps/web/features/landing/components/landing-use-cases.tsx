'use client';

import { useTranslations } from 'next-intl';
import {
  Building2,
  Landmark,
  Lightbulb,
  LineChart,
  Rocket,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const USE_CASES: { key: string; icon: LucideIcon }[] = [
  { key: 'startup', icon: Rocket },
  { key: 'enterprise', icon: Building2 },
  { key: 'newBiz', icon: Lightbulb },
  { key: 'vc', icon: LineChart },
  { key: 'consulting', icon: Users },
  { key: 'public', icon: Landmark },
];

export function LandingUseCases() {
  const t = useTranslations('landing.useCases');

  return (
    <section className="border-y border-black/[0.05] bg-zinc-50/60 py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[15px] text-zinc-600">{t('desc')}</p>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_CASES.map(({ key, icon: Icon }) => (
            <div
              key={key}
              className="flex items-start gap-4 rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                <Icon className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-900">{t(`${key}.title`)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
                  {t(`${key}.desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
