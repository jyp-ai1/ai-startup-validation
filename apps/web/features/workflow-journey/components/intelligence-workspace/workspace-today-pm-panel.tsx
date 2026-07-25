'use client';

import { AlertTriangle, CalendarClock, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceTodayPmPanelProps = {
  confidenceGain?: number;
  className?: string;
};

export function WorkspaceTodayPmPanel({
  confidenceGain = 12,
  className,
}: WorkspaceTodayPmPanelProps) {
  const t = useTranslations('workflow.epic3.todayPm');

  return (
    <section
      className={cn('rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">{t('label')}</p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>

      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="size-3.5 text-amber-600" aria-hidden />
            {t('risk')}
          </dt>
          <dd className="mt-2 text-sm font-medium leading-relaxed">{t('riskValue')}</dd>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {t('recommendation')}
          </dt>
          <dd className="mt-2 text-sm font-medium leading-relaxed">{t('recommendationValue')}</dd>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarClock className="size-3.5" aria-hidden />
            {t('schedule')}
          </dt>
          <dd className="mt-2 text-sm font-medium">{t('scheduleValue')}</dd>
          <dd className="mt-1 text-xs text-muted-foreground">{t('scheduleEta')}</dd>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <TrendingUp className="size-3.5 text-emerald-600" aria-hidden />
            {t('confidenceGain')}
          </dt>
          <dd className="mt-2 text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            +{confidenceGain}%
          </dd>
          <dd className="mt-1 text-xs text-muted-foreground">{t('confidenceGainHint')}</dd>
        </div>
      </dl>
    </section>
  );
}
