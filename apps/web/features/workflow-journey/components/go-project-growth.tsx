'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type GoProjectGrowthProps = {
  from?: number;
  to?: number;
  className?: string;
};

export function GoProjectGrowth({ from = 53, to = 81, className }: GoProjectGrowthProps) {
  const t = useTranslations('workflow.goCelebration');
  const [value, setValue] = useState(from);

  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(from + (to - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    const frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [from, to]);

  return (
    <div className={cn('rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        {t('growthTitle')}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{t('growthDesc')}</p>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{value}%</p>
        <p className="text-xs text-muted-foreground">{from}% → {to}%</p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
