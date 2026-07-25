'use client';

import { useTranslations } from 'next-intl';
import { Download, Flag, Megaphone } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { useFeatureFlags, type FeatureFlagKey } from '@/lib/site/feature-flags';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminOpsToolsProps = {
  stats: OpsDashboardStats | null;
};

export function AdminOpsTools({ stats }: AdminOpsToolsProps) {
  const t = useTranslations('operations.adminTools');
  const [flags, updateFlag] = useFeatureFlags();

  function exportCsv() {
    if (!stats) return;
    const rows = [
      ['metric', 'value'],
      ['users', String(stats.operationalMetrics?.users ?? 0)],
      ['sessions', String(stats.operationalMetrics?.sessions ?? 0)],
      ['goCount', String(stats.operationalMetrics?.goCount ?? 0)],
      ['feedbackCount', String(stats.operationalMetrics?.feedbackCount ?? 0)],
      ['retentionRate', String(stats.closedBetaMetrics?.retentionRate ?? 0)],
      ['completionRate', String(stats.closedBetaMetrics?.completionRate ?? 0)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `launchlens-ops-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="size-4" />
            {t('featureFlags')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map((flag) => (
            <label key={flag.key} className="flex items-center justify-between gap-3 text-sm">
              <span className="font-mono text-xs">{flag.key}</span>
              <input
                type="checkbox"
                checked={flag.enabled}
                onChange={() => updateFlag(flag.key as FeatureFlagKey, !flag.enabled)}
                className="size-4 rounded border-input"
              />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">{t('featureFlagsHint')}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4" />
            {t('notice')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant="secondary">{t('noticeActive')}</Badge>
          <p className="text-sm text-muted-foreground">{t('noticeBody')}</p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="size-4" />
            {t('export')}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!stats}>
            {t('exportCsv')}
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('exportHint')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
