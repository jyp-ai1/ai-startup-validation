'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Brain, Layers, Save } from 'lucide-react';

const STEPS: { key: string; icon: LucideIcon }[] = [
  { key: 'step1', icon: Brain },
  { key: 'step2', icon: Layers },
  { key: 'step3', icon: Save },
];

export function LandingHowItWorks() {
  const t = useTranslations('landing.gtm.howItWorks');

  return (
    <section id="how-it-works" className="py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">{t('desc')}</p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map(({ key, icon: Icon }, index) => (
            <div key={key} className="relative text-center md:text-left">
              {index < STEPS.length - 1 ? (
                <ArrowRight
                  className="absolute -bottom-6 left-1/2 hidden size-5 -translate-x-1/2 text-border md:-right-4 md:bottom-auto md:left-auto md:top-8 md:block md:translate-x-0"
                  aria-hidden
                />
              ) : null}
              <div className="mx-auto flex size-10 items-center justify-center rounded-lg border border-border bg-muted/30 md:mx-0">
                <Icon className="size-5 text-foreground" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
