'use client';

import { Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { cn } from '@repo/ui/lib/utils';

type JourneyDailyCoachProps = {
  confidence: number;
  className?: string;
};

export function JourneyDailyCoach({ confidence, className }: JourneyDailyCoachProps) {
  const t = useTranslations('workflow.epic3.coach');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-5 sm:p-6',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500',
        className,
      )}
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sparkles className="size-3.5" aria-hidden />
        {t('eyebrow')}
      </p>
      <h2 className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl">{t('greeting')}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {t('focusLine', {
          current: confidence,
          after: DAILY_COACH.confidenceAfter,
        })}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {t('eta', { minutes: DAILY_COACH.etaMinutes })}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 font-medium text-emerald-700 dark:text-emerald-400">
          <TrendingUp className="size-3.5" aria-hidden />
          {t('gainHint', { gain: DAILY_COACH.todayGain })}
        </span>
      </div>
    </section>
  );
}
