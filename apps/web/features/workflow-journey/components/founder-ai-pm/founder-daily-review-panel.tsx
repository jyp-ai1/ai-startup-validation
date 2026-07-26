'use client';

import { ArrowRight, Check, Moon, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderDailyReview } from '../../lib/founder-intelligence-engine';

type FounderDailyReviewPanelProps = {
  review: FounderDailyReview;
  className?: string;
};

export function FounderDailyReviewPanel({ review, className }: FounderDailyReviewPanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.dailyReview');

  return (
    <section
      className={cn(
        'rounded-2xl border border-border/70 bg-gradient-to-br from-indigo-500/[0.06] to-card p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
        <Moon className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('summary', {
          delta: review.scoreDelta,
          minutes: review.totalMinutesInvested,
        })}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('advanced')}
          </p>
          <ul className="mt-2 space-y-2" role="list">
            {review.advances && review.advances.length > 0
              ? review.advances.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
                  >
                    <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    {item}
                  </li>
                ))
              : review.advanceKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
                  >
                    <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
                    {t(`advances.${key}`)}
                  </li>
                ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('stillPending')}
          </p>
          <ul className="mt-2 space-y-2" role="list">
            {review.pending && review.pending.length > 0
              ? review.pending.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <X className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {item}
                  </li>
                ))
              : review.pendingKeys.map((key) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <X className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    {t(`pending.${key}`)}
                  </li>
                ))}
          </ul>
        </div>
      </div>

      <p className="mt-5 flex items-center gap-2 text-sm font-medium">
        <ArrowRight className="size-4 text-primary" aria-hidden />
        {review.tomorrowFocus ??
          t('tomorrow', { focus: t(`tomorrowFocus.${review.tomorrowFocusKey}`) })}
      </p>
    </section>
  );
}
