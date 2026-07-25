'use client';

import { useTranslations } from 'next-intl';
import { Lightbulb, Target, TrendingUp } from 'lucide-react';

const REASONS = [
  { key: 'marketFirst', icon: Target },
  { key: 'competitionSecond', icon: TrendingUp },
  { key: 'decisionLast', icon: Lightbulb },
] as const;

export function LandingWhySection() {
  const t = useTranslations('landing.why');

  return (
    <section id="why" className="border-y border-border/50 bg-muted/20 py-16 sm:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t('title')}</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {REASONS.map(({ key, icon: Icon }, index) => (
            <article
              key={key}
              className="animate-in fade-in slide-in-from-bottom-3 rounded-[20px] border border-border/60 bg-card p-6 shadow-sm duration-700"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="size-5" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t(`${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(`${key}.desc`)}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
