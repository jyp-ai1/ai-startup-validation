'use client';

import { useTranslations } from 'next-intl';
import { GitBranch } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminConversionFunnelPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminConversionFunnelPanel({ stats }: AdminConversionFunnelPanelProps) {
  const t = useTranslations('operations.conversionFunnel');
  const rows = stats.conversionFunnel ?? [];

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GitBranch className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.step}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">
                {index > 0 ? '↓ ' : ''}
                {row.label}
              </span>
              <span className="tabular-nums text-muted-foreground">
                {row.rateFromLanding}%
                {index > 0 ? ` · ${row.rateFromPrevious}% step` : ''} · {row.count}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500"
                style={{ width: `${Math.max(row.rateFromLanding, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
