'use client';

import { useTranslations } from 'next-intl';
import { Route } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminJourneyAnalyticsPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminJourneyAnalyticsPanel({ stats }: AdminJourneyAnalyticsPanelProps) {
  const t = useTranslations('operations.journeyAnalytics');
  const rows = stats.journeyAnalytics ?? [];

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Route className="size-4 text-muted-foreground" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">{t('columns.step')}</th>
              <th className="pb-2 pr-4 font-medium">{t('columns.dwell')}</th>
              <th className="pb-2 pr-4 font-medium">{t('columns.dropOff')}</th>
              <th className="pb-2 pr-4 font-medium">{t('columns.return')}</th>
              <th className="pb-2 font-medium">{t('columns.completion')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.step} className="border-b border-border/40 last:border-0">
                <td className="py-2.5 pr-4 font-medium">{row.step}</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.avgDwellSeconds}s</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.dropOffPercent}%</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.returnRate}%</td>
                <td className="py-2.5 tabular-nums">{row.completionRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
