'use client';

import { useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminFunnelHeatmapPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminFunnelHeatmapPanel({ stats }: AdminFunnelHeatmapPanelProps) {
  const t = useTranslations('operations.funnelHeatmap');
  const rows = stats.funnelHeatmap ?? [];

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="size-4 text-orange-600 dark:text-orange-400" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.step}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {row.percent}% · {row.count}
              </span>
            </div>
            <div className="flex h-4 overflow-hidden rounded bg-muted">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-full flex-1 border-r border-background/50 last:border-r-0',
                    i < Math.round(row.percent / 10)
                      ? 'bg-gradient-to-t from-orange-600 to-amber-400 dark:from-orange-700 dark:to-amber-500'
                      : 'bg-transparent',
                  )}
                  aria-hidden
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
