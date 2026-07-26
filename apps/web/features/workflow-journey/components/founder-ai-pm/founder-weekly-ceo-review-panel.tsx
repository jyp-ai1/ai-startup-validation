'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WeeklyCeoReview } from '../../lib/founder-personalization-engine';

type FounderWeeklyCeoReviewPanelProps = {
  review: WeeklyCeoReview;
  className?: string;
};

export function FounderWeeklyCeoReviewPanel({ review, className }: FounderWeeklyCeoReviewPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.weeklyCeoReview');

  const wins = [t('wins.market'), t('wins.interviews')];
  const riskLabel = review.biggestRisk
    ? t(`risks.${review.biggestRisk}` as 'risks.customerInterview')
    : t('risks.pricingValidation');
  const projectedScore = Math.min(100, review.scoreTo + 5);

  return (
    <section
      className={cn(
        'rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-800 dark:text-violet-300">
        <CalendarDays className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>

      <div className="mt-5 space-y-5 text-sm">
        <div>
          <p className="font-semibold">{t('winsTitle')}</p>
          <ul className="mt-2 space-y-1.5" role="list">
            {wins.map((win) => (
              <li key={win} className="flex items-start gap-2 text-muted-foreground">
                <span className="text-emerald-600 dark:text-emerald-400" aria-hidden>
                  ✓
                </span>
                {win}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold">{t('riskTitle')}</p>
          <p className="mt-2 text-muted-foreground">{riskLabel}</p>
        </div>

        <div>
          <p className="font-semibold">{t('nextWeekTitle')}</p>
          <p className="mt-2 text-muted-foreground">{review.nextWeekPriority}</p>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/90 p-4">
          <p className="font-semibold">{t('scoreProjectionTitle')}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums">
            {review.scoreTo}% → {projectedScore}%
          </p>
        </div>
      </div>
    </section>
  );
}
