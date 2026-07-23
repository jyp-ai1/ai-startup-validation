'use client';

import { useTranslations } from 'next-intl';

import type { ExecutiveKpiValue, ExecutiveKeyMetric } from '../services/executive-types';
import { cn } from '@repo/ui/lib/utils';

type ExecutiveKeyMetricsProps = {
  typeKpis: ExecutiveKpiValue[];
  keyMetrics: ExecutiveKeyMetric[];
};

export function ExecutiveKeyMetrics({ typeKpis, keyMetrics }: ExecutiveKeyMetricsProps) {
  const t = useTranslations('executive');

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('typeKpis.title')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {typeKpis.map((kpi) => (
            <TypeKpiCard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t('metrics.title')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {keyMetrics.map((metric) => (
            <MetricCard key={metric.id} metric={metric} />
          ))}
        </div>
      </section>
    </div>
  );
}

function TypeKpiCard({ kpi }: { kpi: ExecutiveKpiValue }) {
  const t = useTranslations('executive');

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card px-5 py-4',
        kpi.placeholder && 'border-dashed opacity-80',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t(kpi.labelKey as 'kpis.startup.tam')}
        {kpi.placeholder ? ` · ${t('placeholder')}` : null}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
        {kpi.value}
        {kpi.unitKey ? (
          <span className="ml-1 text-sm font-normal text-muted-foreground">
            {t(kpi.unitKey as 'kpis.units.score')}
          </span>
        ) : null}
      </p>
    </div>
  );
}

function MetricCard({ metric }: { metric: ExecutiveKeyMetric }) {
  const t = useTranslations('executive');

  return (
    <div className="rounded-xl border border-border/50 bg-card px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {t(metric.labelKey as 'metrics.decisionScore')}
      </p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
        {metric.value}
        {metric.format === 'percent' ? (
          <span className="text-lg font-semibold text-muted-foreground">%</span>
        ) : null}
      </p>
    </div>
  );
}
