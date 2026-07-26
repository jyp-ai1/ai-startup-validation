'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ConfidenceBreakdownItem } from '../../constants/decision-experience';

type ConfidenceBreakdownPanelProps = {
  items: ConfidenceBreakdownItem[];
  total: number;
  className?: string;
};

export function ConfidenceBreakdownPanel({ items, total, className }: ConfidenceBreakdownPanelProps) {
  const t = useTranslations('workflow.founderAiPm.breakdown');

  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/80 p-4', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('title')}
        </p>
        <p className="text-2xl font-bold tabular-nums text-foreground">{total}%</p>
      </div>
      <dl className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item.categoryKey} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-muted-foreground">{t(`categories.${item.categoryKey}`)}</dt>
            <dd
              className={cn(
                'font-semibold tabular-nums',
                item.delta >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400',
              )}
            >
              {item.delta >= 0 ? '+' : ''}
              {item.delta}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
