'use client';

import { useTranslations } from 'next-intl';
import { HelpCircle } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminQuestionDetailPanelProps = {
  stats: OpsDashboardStats;
};

export function AdminQuestionDetailPanel({ stats }: AdminQuestionDetailPanelProps) {
  const t = useTranslations('operations.questionDetail');
  const rows = stats.questionAnalyticsDetail ?? [];

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <HelpCircle className="size-4" aria-hidden />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
              <th className="pb-2 pr-4">{t('columns.question')}</th>
              <th className="pb-2 pr-4">{t('columns.avgTime')}</th>
              <th className="pb-2 pr-4">{t('columns.dropOff')}</th>
              <th className="pb-2 pr-4">{t('columns.skipped')}</th>
              <th className="pb-2">{t('columns.aiHelp')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.questionId} className="border-b border-border/40 last:border-0">
                <td className="py-2.5 pr-4 font-medium">{t(`questions.${row.questionId}`)}</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.avgMinutes}m</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.dropOffPercent}%</td>
                <td className="py-2.5 pr-4 tabular-nums">{row.skipPercent}%</td>
                <td className="py-2.5 tabular-nums">{row.aiHelpClickPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
