'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderActionRecord } from '../../lib/founder-behavior-store';

type FounderActionHistoryPanelProps = {
  history: FounderActionRecord[];
  className?: string;
};

function formatRelativeDay(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays === 2) return 'twoDaysAgo';
  return 'earlier';
}

export function FounderActionHistoryPanel({ history, className }: FounderActionHistoryPanelProps) {
  const t = useTranslations('workflow.founderAiPm.actionHistory');
  const tk = useTranslations('workflow.founderAiPm.actionWorkspace.kinds');

  if (history.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('label')}
    >
      <h2 className="text-base font-semibold">{t('title')}</h2>
      <ol className="mt-4 space-y-3" role="list">
        {history.slice(0, 5).map((entry) => {
          const dayKey = formatRelativeDay(entry.completedAt);
          return (
            <li
              key={entry.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/30 px-4 py-3"
            >
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t(`days.${dayKey}`)}
                </p>
                <p className="mt-0.5 text-sm font-medium">
                  ✔ {entry.title || tk(entry.kind)}
                </p>
              </div>
              <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                +{entry.goImpact}%
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
