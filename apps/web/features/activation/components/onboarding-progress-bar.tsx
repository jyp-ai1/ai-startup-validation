'use client';

import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { cn } from '@repo/ui/lib/utils';

const STEPS = ['research', 'voc', 'evidence', 'decision', 'report'] as const;

type OnboardingProgressBarProps = {
  stats: ProjectDashboardStats;
  className?: string;
};

function stepComplete(step: (typeof STEPS)[number], stats: ProjectDashboardStats): boolean {
  switch (step) {
    case 'research':
      return stats.research.total > 0;
    case 'voc':
      return stats.voc.total > 0;
    case 'evidence':
      return stats.evidence.total > 0;
    case 'decision':
      return stats.validationScore !== null;
    case 'report':
      return stats.recentActivity.some((a) => a.type === 'REPORT');
    default:
      return false;
  }
}

export function OnboardingProgressBar({ stats, className }: OnboardingProgressBarProps) {
  const t = useTranslations('activation.progress');
  const completedCount = STEPS.filter((step) => stepComplete(step, stats)).length;
  const percent = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className={cn('rounded-xl border border-border/60 bg-card px-4 py-3', className)}>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t('label')}
        </p>
        <span className="text-sm font-bold tabular-nums text-primary">{percent}%</span>
      </div>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <ol className="flex flex-wrap gap-x-3 gap-y-1">
        {STEPS.map((step, index) => {
          const done = stepComplete(step, stats);
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-1.5 text-xs',
                done ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[10px] font-bold',
                  done ? 'bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {index + 1}
              </span>
              {t(`steps.${step}`)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
