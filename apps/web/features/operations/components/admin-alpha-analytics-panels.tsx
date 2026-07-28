'use client';

import { useTranslations } from 'next-intl';
import { Clock, HelpCircle, RefreshCw, TrendingDown, Workflow } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminAlphaAnalyticsPanelsProps = {
  stats: OpsDashboardStats;
};

export function AdminAlphaAnalyticsPanels({ stats }: AdminAlphaAnalyticsPanelsProps) {
  const t = useTranslations('operations.alphaAnalytics');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {stats.retentionRates ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="size-4" aria-hidden />
              {t('retention.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {stats.retentionRates.map((row) => (
                <div key={row.day} className="rounded-lg border border-border/60 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{row.day}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{row.rate}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {stats.timeAnalytics ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" aria-hidden />
              {t('time.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.timeAnalytics.map((row) => (
              <div
                key={`${row.from}-${row.to}`}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <span>
                  {row.from} → {row.to}
                </span>
                <span className="font-semibold tabular-nums">{row.avgMinutes}m</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {stats.dropReasons ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="size-4" aria-hidden />
              {t('dropReason.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.dropReasons.map((row) => (
              <div key={row.reason}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t(`dropReason.${row.reason.toLowerCase()}`, { default: row.reason })}</span>
                  <span className="tabular-nums font-medium">{row.percent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-red-500/80"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {stats.questionAnalytics ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="size-4" aria-hidden />
              {t('questions.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.questionAnalytics.map((row) => (
              <div key={row.question}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{t(`questions.${row.question}`)}</span>
                  <span className="tabular-nums font-medium">{row.stuckPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${row.stuckPercent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {stats.aiPmWorking ? (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Workflow className="size-4" aria-hidden />
              {t('aiPmWorking.title')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('aiPmWorking.subtitle')}</p>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-xl border border-violet-300/30 bg-violet-500/5 p-4 text-center dark:border-violet-900">
              <p className="text-sm text-muted-foreground">{t('aiPmWorking.avgLoop')}</p>
              <p className="text-3xl font-semibold tabular-nums">{stats.aiPmWorking.avgLoopCount}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label={t('aiPmWorking.investigations')} value={stats.aiPmWorking.investigationsToday} />
              <Metric label={t('aiPmWorking.evidence')} value={stats.aiPmWorking.evidenceCreatedToday} />
              <Metric label={t('aiPmWorking.founderEdits')} value={stats.aiPmWorking.founderEditsToday} />
              <Metric label={t('aiPmWorking.aiReReviews')} value={stats.aiPmWorking.aiReReviewsToday} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
