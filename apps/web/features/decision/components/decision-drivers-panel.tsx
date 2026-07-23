'use client';

import { useTranslations } from 'next-intl';

import type { DecisionDriver } from '@/features/decision';
import { cn } from '@repo/ui/lib/utils';

type DecisionDriversPanelProps = {
  drivers: DecisionDriver[];
  onDriverClick?: (driverId: string) => void;
};

export function DecisionDriversPanel({ drivers, onDriverClick }: DecisionDriversPanelProps) {
  const t = useTranslations('decision.drivers');

  if (drivers.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
      </div>
      <div className="space-y-3">
        {drivers.map((driver, index) => (
          <button
            key={driver.id}
            type="button"
            onClick={() => onDriverClick?.(driver.id)}
            className="flex w-full items-center gap-4 rounded-lg border border-border/50 bg-card px-5 py-4 text-left transition-colors hover:border-primary/40"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-medium">
              {t(driver.labelKey as 'marketGrowth')}
            </span>
            <span
              className={cn(
                'shrink-0 text-lg font-bold tabular-nums',
                driver.direction === 'positive'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {driver.impact > 0 ? '+' : ''}
              {driver.impact}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
