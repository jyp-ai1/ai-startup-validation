'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderTodayHeroProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  onStart: () => void;
  className?: string;
};

export function FounderTodayHero({
  score,
  primaryAction,
  onStart,
  className,
}: FounderTodayHeroProps) {
  const t = useTranslations('workflow.founderAiPm.todayHeroCompact');
  const minutes = primaryAction?.etaMinutes ?? 15;
  const afterScore = Math.min(100, score.percent + (primaryAction?.goImpact ?? 4));

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.1] to-background p-6 text-center shadow-sm sm:p-8',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-lg font-semibold">{t('todayLabel')}</p>
      <p className="mt-4 text-base text-muted-foreground">{t('investmentLead')}</p>
      <p className="mt-1 text-4xl font-bold tabular-nums sm:text-5xl">
        {t('minutes', { count: minutes })}
      </p>
      <p className="mt-6 text-base text-muted-foreground">{t('scoreLead')}</p>
      <p className="mt-2 flex items-center justify-center gap-3 text-3xl font-bold tabular-nums sm:text-4xl">
        <span>{score.percent}%</span>
        <ArrowRight className="size-6 text-muted-foreground" aria-hidden />
        <span className="text-emerald-600 dark:text-emerald-400">{afterScore}%</span>
      </p>
      <Button
        type="button"
        size="lg"
        className="mt-8 h-14 w-full max-w-sm rounded-xl text-base font-semibold"
        onClick={onStart}
      >
        {t('startCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}
