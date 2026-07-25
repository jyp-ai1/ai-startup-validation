'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { HEALTH_DETAIL } from '../constants/intelligence-mock';

type ProjectHealthVisualProps = {
  className?: string;
};

const HEALTH_KEYS = ['market', 'execution', 'finance', 'technology', 'customer'] as const;

export function ProjectHealthVisual({ className }: ProjectHealthVisualProps) {
  const t = useTranslations('workflow.decisionExperience.health');

  return (
    <div className={cn('space-y-2.5', className)}>
      {HEALTH_KEYS.map((key) => {
        const value = HEALTH_DETAIL[key];
        const warn = value < 60;
        return (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t(key)}</span>
              <span
                className={cn(
                  'font-semibold tabular-nums',
                  warn ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                )}
              >
                {value}
                {warn ? ' ⚠' : ''}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-[width] duration-700',
                  warn ? 'bg-amber-500' : value >= 80 ? 'bg-emerald-500' : 'bg-primary',
                )}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
