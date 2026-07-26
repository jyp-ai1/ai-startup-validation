'use client';

import { CalendarDays, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { WeeklyCeoReview } from '../../lib/founder-personalization-engine';

type FounderWeeklyCeoReviewPanelProps = {
  review: WeeklyCeoReview;
  className?: string;
};

export function FounderWeeklyCeoReviewPanel({ review, className }: FounderWeeklyCeoReviewPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.weeklyCeoReview');

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

      <div className="mt-4 rounded-xl border border-border/60 bg-background/90 p-4">
        <p className="text-sm text-muted-foreground">{t('scoreChange')}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">
          {review.scoreFrom}% → {review.scoreTo}%
          {review.scoreDelta > 0 ? (
            <span className="ml-2 text-base font-semibold text-emerald-600">
              +{review.scoreDelta}%
            </span>
          ) : null}
        </p>
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-semibold text-foreground">{t('bestDecision')}</dt>
          <dd className="mt-1 text-muted-foreground">{review.bestDecision}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">{t('biggestRisk')}</dt>
          <dd className="mt-1 text-muted-foreground">
            {review.biggestRisk
              ? t(`risks.${review.biggestRisk}` as 'risks.customerInterview')
              : t('risks.marketEvidence')}
          </dd>
        </div>
        {review.missedOpportunity ? (
          <div>
            <dt className="font-semibold text-foreground">{t('missedOpportunity')}</dt>
            <dd className="mt-1 text-muted-foreground">
              {t(`risks.${review.missedOpportunity}` as 'risks.customerInterview')}
            </dd>
          </div>
        ) : null}
        <div className="rounded-xl bg-primary/[0.06] px-4 py-3">
          <dt className="flex items-center gap-1.5 font-semibold text-primary">
            <Sparkles className="size-3.5" aria-hidden />
            {t('nextWeek')}
          </dt>
          <dd className="mt-1 leading-relaxed">{review.nextWeekPriority}</dd>
        </div>
      </dl>
    </section>
  );
}
