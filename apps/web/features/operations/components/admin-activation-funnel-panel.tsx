'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle, BarChart3, MousePointerClick, Target, TrendingDown } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

type AdminActivationFunnelPanelProps = {
  stats: OpsDashboardStats;
};

const STEP_KEYS = [
  'landing',
  'goal',
  'workflow',
  'project',
  'analysisCompleted',
  'nextActionStarted',
] as const;

export function AdminActivationFunnelPanel({ stats }: AdminActivationFunnelPanelProps) {
  const t = useTranslations('operations.activationFunnel');
  const funnel = stats.activationLoopFunnel;
  const drops = stats.activationLoopDropOff ?? [];
  const brief = stats.productOs;
  const providers = stats.analyticsProviders;

  if (!funnel) return null;

  const maxCount = Math.max(...STEP_KEYS.map((k) => funnel[k]), 1);
  const worst = drops.reduce(
    (max, row) => (row.dropPercent > (max?.dropPercent ?? -1) ? row : max),
    drops[0],
  );

  return (
    <Card className="border-amber-300/40 bg-gradient-to-br from-amber-50/40 to-background dark:border-amber-900 dark:from-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="size-4 text-amber-700 dark:text-amber-400" aria-hidden />
            {t('title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">
              {t('conversion')}: {stats.activationLoopConversion ?? 0}%
            </Badge>
            {providers?.posthog ? (
              <Badge variant="secondary">{t('posthog')}</Badge>
            ) : null}
            {providers?.clarity ? (
              <Badge variant="secondary">{t('clarity')}</Badge>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <ol className="space-y-3" role="list">
          {STEP_KEYS.map((key, index) => {
            const count = funnel[key];
            const pct = Math.round((count / maxCount) * 100);
            const drop = index > 0 ? drops[index - 1] : undefined;
            const isWorst = worst && drop?.step === worst.step;

            return (
              <li key={key}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{t(`steps.${key}`)}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      isWorst ? 'bg-amber-500' : 'bg-primary',
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {drop && drop.dropPercent > 0 ? (
                  <p
                    className={cn(
                      'mt-1 flex items-center gap-1 text-xs',
                      isWorst
                        ? 'font-semibold text-amber-800 dark:text-amber-300'
                        : 'text-muted-foreground',
                    )}
                  >
                    <TrendingDown className="size-3" aria-hidden />
                    {t('drop', { percent: drop.dropPercent, step: drop.step })}
                    {isWorst ? (
                      <Badge className="ml-1 text-[9px]" variant="destructive">
                        {t('worst')}
                      </Badge>
                    ) : null}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>

        {brief ? (
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <BarChart3 className="size-3.5" aria-hidden />
              {t('aiPmRecommend')}
            </p>
            <p className="mt-2 text-sm font-semibold">{brief.aiPm.recommendedExperiment}</p>
            <p className="mt-1 text-sm text-muted-foreground">{brief.rootCause}</p>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">{t('expectedLift')}</dt>
                <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                  {brief.aiPm.expectedLift}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('measure')}</dt>
                <dd className="font-mono text-xs">{brief.measureBy}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('priority')}</dt>
                <dd>{brief.aiPm.priority}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="flex flex-wrap items-start gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          <MousePointerClick className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>{t('heatmapHint')}</p>
          {!providers?.posthog && !providers?.clarity ? (
            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="size-3" aria-hidden />
              {t('heatmapMissing')}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
