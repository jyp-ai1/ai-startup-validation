'use client';

import { useTranslations } from 'next-intl';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { cn } from '@repo/ui/lib/utils';

import {
  computeWorkspaceHealthMetrics,
  healthTone,
  type WorkspaceHealthMetric,
} from '../utils/workspace-health';

type WorkspaceHealthBadgesProps = {
  stats: ProjectDashboardStats;
  hasExecutiveReport?: boolean;
  className?: string;
};

export function WorkspaceHealthBadges({
  stats,
  hasExecutiveReport = false,
  className,
}: WorkspaceHealthBadgesProps) {
  const t = useTranslations('polish');
  const metrics = computeWorkspaceHealthMetrics(stats, hasExecutiveReport);

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('health.title')}
      </p>
      <div className="flex flex-wrap gap-2">
        {metrics.map((metric) => (
          <HealthBadge key={metric.id} metric={metric} label={t(metric.labelKey as 'health.research')} />
        ))}
      </div>
    </div>
  );
}

function HealthBadge({ metric, label }: { metric: WorkspaceHealthMetric; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums motion-safe:transition-colors',
        healthTone(metric.percent),
      )}
      title={`${label}: ${metric.percent}%`}
    >
      <span>{label}</span>
      <span className="font-semibold">{metric.percent}%</span>
    </span>
  );
}
