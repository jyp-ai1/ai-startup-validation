'use client';

import { useTranslations } from 'next-intl';
import { Brain } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminAiPmKpiPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminAiPmKpiPanel({ stats }: AdminAiPmKpiPanelProps) {
  const t = useTranslations('operations.aiPmKpi');
  const kpis = stats.aiPmKpis;

  if (!kpis) return null;

  const rows = [
    { key: 'strategyChangesToday', value: kpis.strategyChangesToday },
    { key: 'priceChanges', value: kpis.priceChanges },
    { key: 'competitorAddsToday', value: kpis.competitorAddsToday },
    { key: 'suggestionAdoptionRate', value: `${kpis.suggestionAdoptionRate}%` },
    { key: 'investigationsToday', value: kpis.investigationsToday },
    { key: 'newEvidenceToday', value: kpis.newEvidenceToday },
    { key: 'artifactsToday', value: kpis.artifactsToday },
    { key: 'totalDecisionChanges', value: kpis.totalDecisionChanges },
  ] as const;

  return (
    <Card className="border-violet-300/40 bg-gradient-to-br from-violet-50/30 to-background dark:border-violet-900 dark:from-violet-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain className="size-4 text-violet-700 dark:text-violet-400" aria-hidden />
          {t('title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((row) => (
            <div key={row.key} className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">{t(`metrics.${row.key}`)}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{row.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
