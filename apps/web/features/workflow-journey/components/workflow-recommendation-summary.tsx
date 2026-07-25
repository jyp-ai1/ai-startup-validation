'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, Clock, Sparkles, Target } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type WorkflowRecommendationSummaryProps = {
  goalLabel: string;
  className?: string;
};

/** Phase 1 — AI recommendation: Why · Expected result · Confidence · Risk · Duration */
export function WorkflowRecommendationSummary({ goalLabel, className }: WorkflowRecommendationSummaryProps) {
  const t = useTranslations('workflow.confirmation.recommendation');

  const metrics = [
    { key: 'expected' as const, icon: Target, tone: 'text-primary' },
    { key: 'confidence' as const, icon: Sparkles, tone: 'text-emerald-600 dark:text-emerald-400' },
    { key: 'risk' as const, icon: AlertTriangle, tone: 'text-amber-700 dark:text-amber-400' },
    { key: 'duration' as const, icon: Clock, tone: 'text-muted-foreground' },
  ];

  return (
    <section
      className={cn('rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:p-5', className)}
      aria-labelledby="workflow-recommendation-title"
    >
      <p id="workflow-recommendation-title" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        {t('title')}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-foreground">{t('lead', { goal: goalLabel })}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {metrics.map(({ key, icon: Icon, tone }, index) => (
          <div
            key={key}
            className="rounded-lg border border-border/50 bg-background/80 px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Icon className={cn('size-3.5', tone)} aria-hidden />
              {t(`${key}.label`)}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{t(`${key}.value`)}</dd>
            <dd className="mt-0.5 text-xs text-muted-foreground">{t(`${key}.hint`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
