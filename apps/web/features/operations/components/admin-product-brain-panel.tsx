'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, FlaskConical, ListOrdered, RotateCcw, TrendingUp } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminProductBrainPanelProps = {
  brain: NonNullable<OpsDashboardStats['productBrain']>;
};

export function AdminProductBrainPanel({ brain }: AdminProductBrainPanelProps) {
  const t = useTranslations('operations.productBrain');

  const experiments = brain.experiments;
  const kpiTrend = brain.kpiTrend ?? [];
  const queue = brain.aiPriorityQueue ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-primary" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {experiments ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <ExperimentList
              title={t('active')}
              items={experiments.active}
              empty={t('empty')}
              variant="active"
            />
            <ExperimentList
              title={t('completed')}
              items={experiments.completed}
              empty={t('empty')}
              variant="completed"
            />
            <ExperimentList
              title={t('failed')}
              items={experiments.failed}
              empty={t('empty')}
              variant="failed"
            />
          </div>
        ) : null}

        {kpiTrend.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="size-3.5" aria-hidden />
              {t('kpiTrend')}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[320px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">{t('kpi')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('days7')}</th>
                    <th className="pb-2 font-medium">{t('days30')}</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiTrend.map((row) => (
                    <tr key={row.kpiLabel} className="border-b border-border/40 last:border-0">
                      <td className="py-2 pr-4 font-medium">{row.kpiLabel}</td>
                      <td className="py-2 pr-4 tabular-nums">{row.days7}%</td>
                      <td className="py-2 tabular-nums text-muted-foreground">{row.days30}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {queue.length > 0 ? (
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <ListOrdered className="size-3.5" aria-hidden />
              {t('priorityQueue')}
            </p>
            <ol className="mt-3 space-y-2" role="list">
              {queue.map((item) => (
                <li
                  key={`${item.priority}-${item.kpi}`}
                  className="flex flex-wrap items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm"
                >
                  <Badge variant={item.priority === 'P0' ? 'default' : 'secondary'}>
                    {item.priority}
                  </Badge>
                  <span className="font-medium">{item.kpi}</span>
                  <span className="text-muted-foreground">— {item.action}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ExperimentList({
  title,
  items,
  empty,
  variant,
}: {
  title: string;
  items: { id: string; name: string; kpiLabel: string; status: string }[];
  empty: string;
  variant: 'active' | 'completed' | 'failed';
}) {
  const icon =
    variant === 'completed' ? (
      <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
    ) : variant === 'failed' ? (
      <RotateCcw className="size-3.5 text-red-600" aria-hidden />
    ) : (
      <FlaskConical className="size-3.5 text-primary" aria-hidden />
    );

  return (
    <div className="rounded-xl border border-border/60 bg-background/80 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
        <Badge variant="outline" className="ml-auto text-[10px]">
          {items.length}
        </Badge>
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2" role="list">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{item.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.kpiLabel}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
