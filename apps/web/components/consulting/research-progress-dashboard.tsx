'use client';

import { useTranslations } from 'next-intl';

import type { ResearchPlan } from '@repo/types/validation';
import { RESEARCH_TYPES } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

type ResearchProgressDashboardProps = {
  plans: ResearchPlan[];
  className?: string;
};

export function ResearchProgressDashboard({ plans, className }: ResearchProgressDashboardProps) {
  const t = useTranslations();
  const tType = useTranslations('enums.researchType');

  const groups = RESEARCH_TYPES.map((type) => {
    const items = plans.filter((plan) => plan.researchType === type);
    const completed = items.filter((plan) => plan.status === 'COMPLETED').length;
    return { type, completed, total: items.length };
  }).filter((group) => group.total > 0);

  const completedTotal = plans.filter((p) => p.status === 'COMPLETED').length;
  const completionPct = plans.length > 0 ? Math.round((completedTotal / plans.length) * 100) : 0;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label={t('research.summary', { completed: completedTotal, total: plans.length })} value={`${completionPct}%`} />
        <MetricTile label={t('research.columns.status')} value={String(completedTotal)} />
        <MetricTile label={t('research.columns.type')} value={String(groups.length)} />
      </div>

      <div className="ll-consulting-card">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('research.progressByType')}
        </p>
        <div className="mt-6 space-y-4">
          {groups.map(({ type, completed, total }) => (
            <div key={type}>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-medium">{tType(type)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {completed}/{total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-consulting-accent transition-all duration-700"
                  style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ll-consulting-card px-6 py-6">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
