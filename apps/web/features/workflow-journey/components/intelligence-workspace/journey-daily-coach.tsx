'use client';

import { Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DAILY_COACH } from '@/features/project-intelligence/constants/daily-coach';
import { cn } from '@repo/ui/lib/utils';

type JourneyDailyCoachProps = {
  confidence: number;
  className?: string;
  variant?: 'default' | 'hero';
};

export function JourneyDailyCoach({
  confidence,
  className,
  variant = 'default',
}: JourneyDailyCoachProps) {
  const t = useTranslations('workflow.epic3.coach');
  const isHero = variant === 'hero';

  return (
    <section
      className={cn(
        'rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-background',
        isHero ? 'p-8 text-center sm:p-10 lg:p-12' : 'p-6 sm:p-8 lg:p-10',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-700',
        className,
      )}
      aria-live="polite"
    >
      <p
        className={cn(
          'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-primary',
          isHero && 'justify-center',
        )}
      >
        <Sparkles className="size-4" aria-hidden />
        {t('eyebrow')}
      </p>
      <h2
        className={cn(
          'mt-4 font-semibold tracking-tight',
          isHero ? 'text-3xl sm:text-4xl lg:text-[2.75rem]' : 'text-2xl sm:text-3xl lg:text-4xl',
        )}
      >
        {t('greeting')}
      </h2>
      <p
        className={cn(
          'mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg',
          isHero && 'mx-auto',
        )}
      >
        {t('focusLine', {
          current: confidence,
          after: DAILY_COACH.confidenceAfter,
        })}
      </p>
      <p
        className={cn(
          'mt-3 text-sm font-medium text-foreground/80 sm:text-base',
          isHero && 'text-base sm:text-lg',
        )}
      >
        {t('coachLine')}
      </p>
      <div
        className={cn(
          'mt-5 flex flex-wrap items-center gap-4 text-sm',
          isHero && 'justify-center',
        )}
      >
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
