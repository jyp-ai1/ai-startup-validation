'use client';

import { useTranslations } from 'next-intl';
import { Eye } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminBlindSpotPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminBlindSpotPanel({ stats }: AdminBlindSpotPanelProps) {
  const t = useTranslations('operations.blindSpot');
  const rows = stats.blindSpotAnalytics ?? [];
  const insights = stats.aiPmInsightKpis;

  if (rows.length === 0 && !insights) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" aria-hidden />
            {t('title')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.map((row) => (
            <div key={row.spot}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t(`spots.${row.spot}`)}</span>
                <span className="tabular-nums font-medium">{row.count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-violet-600"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {insights ? (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('insightsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums">{insights.clarityQuestionsRaised}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('clarityQuestions')}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4 text-center">
              <p className="text-3xl font-semibold tabular-nums">{insights.blindSpotsFound}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('blindSpotsFound')}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
