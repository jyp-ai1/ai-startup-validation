'use client';

import { useTranslations } from 'next-intl';
import { ArrowDown, FileText, FolderKanban, Scale, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const STEPS: { key: string; icon: LucideIcon }[] = [
  { key: 'step1', icon: FolderKanban },
  { key: 'step2', icon: Search },
  { key: 'step3', icon: Scale },
  { key: 'step4', icon: FileText },
];

export function LandingHowItWorks() {
  const t = useTranslations('landing.howItWorks');

  return (
    <section id="how-it-works" className="py-[120px]">
      <div className="mx-auto max-w-[1440px] px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 md:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-zinc-600">{t('desc')}</p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ key, icon: Icon }, index) => (
            <div key={key} className="relative">
              {index < STEPS.length - 1 ? (
                <ArrowDown className="absolute -bottom-4 left-1/2 z-10 hidden size-4 -translate-x-1/2 text-zinc-300 lg:block lg:-right-3 lg:bottom-auto lg:left-auto lg:top-1/2 lg:translate-x-0 lg:-translate-y-1/2 lg:rotate-[-90deg]" />
              ) : null}
              <div className="flex h-full flex-col rounded-[20px] border border-black/[0.06] bg-white p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)]">
                <span className="text-xs font-bold tabular-nums text-zinc-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="mt-4 flex size-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-800">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-zinc-900">
                  {t(`${key}.title`)}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600">
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
