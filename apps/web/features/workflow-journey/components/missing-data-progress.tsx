'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { MissingDataItem } from '../constants/intelligence-mock';

type MissingDataProgressProps = {
  current: number;
  target: number;
  items: MissingDataItem[];
  completedIds?: string[];
  onItemToggle?: (id: string) => void;
  className?: string;
};

export function MissingDataProgress({
  current,
  target,
  items,
  completedIds = [],
  onItemToggle,
  className,
}: MissingDataProgressProps) {
  const t = useTranslations('workflow.intelligence.missing');
  const completed = completedIds.length;
  const total = items.length;
  const barPct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('title')}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle', { current, target })}</p>
        </div>
        <p className="text-sm font-bold tabular-nums text-foreground">
          {completed}/{total}
        </p>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={target}
      >
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-700 ease-out"
          style={{ width: `${barPct}%` }}
        />
      </div>

      <ul className="space-y-2" role="list">
        {items.map((item) => {
          const done = completedIds.includes(item.id);
          return (
            <li
              key={item.id}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors',
                done
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : 'border-dashed border-border/70',
                onItemToggle && !done && 'cursor-pointer hover:border-primary/40',
              )}
            >
              {onItemToggle ? (
                <button
                  type="button"
                  onClick={() => onItemToggle(item.id)}
                  className="flex flex-1 items-center gap-2 text-left"
                  aria-pressed={done}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border text-[10px]',
                      done
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-muted-foreground/50',
                    )}
                    aria-hidden
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className={cn('flex-1', done && 'text-emerald-900 dark:text-emerald-200')}>
                    {t(`items.${item.labelKey}`)}
                  </span>
                  <span className="text-xs font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                    +{item.gain}
                  </span>
                </button>
              ) : (
                <>
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded border text-[10px]',
                      done
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-muted-foreground/50',
                    )}
                    aria-hidden
                  >
                    {done ? '✓' : ''}
                  </span>
                  <span className={cn('flex-1', done && 'text-emerald-900 dark:text-emerald-200')}>
                    {t(`items.${item.labelKey}`)}
                  </span>
                  <span className="text-xs font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                    +{item.gain}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
