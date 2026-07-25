'use client';

import { CalendarDays } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type WorkspaceWeeklySummaryProps = {
  className?: string;
};

export function WorkspaceWeeklySummary({ className }: WorkspaceWeeklySummaryProps) {
  const t = useTranslations('workflow.epic3.weeklyBrief');

  return (
    <section className={cn('rounded-2xl border border-border/70 bg-card p-5', className)}>
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <CalendarDays className="size-3.5" aria-hidden />
        {t('label')}
      </p>
      <h3 className="mt-2 text-lg font-semibold">{t('title')}</h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-muted/25 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{t('decisions')}</dt>
          <dd className="text-xl font-bold tabular-nums">3</dd>
        </div>
        <div className="rounded-xl bg-muted/25 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{t('confidence')}</dt>
          <dd className="text-xl font-bold tabular-nums text-emerald-600">+19%</dd>
        </div>
        <div className="rounded-xl bg-muted/25 px-3 py-2">
          <dt className="text-xs text-muted-foreground">{t('goRate')}</dt>
          <dd className="text-xl font-bold tabular-nums">1 GO</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">{t('nextWeek')}</p>
    </section>
  );
}
