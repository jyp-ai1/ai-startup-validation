'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { StrategyDashboardData } from '../../lib/founder-strategy-dashboard';
import {
  StrategyBarChart,
  StrategyCompetitorCompare,
  StrategyExecutionList,
  StrategyPositioningMap,
  StrategyScoreTrend,
  StrategySwotGrid,
} from './founder-strategy-charts';

type FounderStrategyDashboardProps = {
  data: StrategyDashboardData;
  onStartAction?: (actionId: string) => void;
  compact?: boolean;
  className?: string;
};

export function FounderStrategyDashboard({
  data,
  onStartAction,
  compact = false,
  className,
}: FounderStrategyDashboardProps) {
  const t = useTranslations('workflow.founderAiPm.executiveWorkspace.dashboard');

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <header className="border-b border-border/60 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          {t('roomLabel')}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight">{data.projectName}</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{t('viability')}</p>
            <p className="text-4xl font-bold tabular-nums text-foreground">{data.scorePercent}%</p>
          </div>
          {!compact ? (
            <div className="flex-1 min-w-[140px]">
              <StrategyScoreTrend values={data.scoreTrend} />
            </div>
          ) : null}
        </div>
      </header>

      <div className={cn('mt-5 space-y-6', compact && 'space-y-4')}>
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('viabilityBreakdown')}</h3>
          <StrategyBarChart items={data.viabilityBreakdown} showWhy />
        </div>

        {!compact ? (
          <>
            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('swot')}</h3>
              <StrategySwotGrid swot={data.swot} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('competitors')}</h3>
              <StrategyCompetitorCompare items={data.competitors} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('positioning')}</h3>
              <StrategyPositioningMap
                points={data.positioning.points}
                ourLabel={data.positioning.ourLabel}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="text-sm font-semibold">{t('pricing')}</h3>
                <p className="mt-2 text-2xl font-bold tabular-nums text-primary">
                  {data.pricing.recommended}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('pricingAvg', { avg: data.pricing.average })}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{data.pricing.reason}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 p-4">
                <h3 className="text-sm font-semibold">{t('recommendedBm')}</h3>
                <p className="mt-2 text-sm leading-relaxed">{data.recommendedBm}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('marketSize', { size: data.marketSize })}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('validation')}</h3>
              <StrategyBarChart items={data.validationProgress} />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold">{t('topRisks')}</h3>
              <ul className="space-y-2" role="list">
                {data.topRisks.map((risk, index) => (
                  <li
                    key={risk}
                    className="flex items-center gap-2 rounded-lg border border-red-200/50 bg-red-50/40 px-3 py-2 text-sm dark:border-red-900/40 dark:bg-red-950/20"
                  >
                    <span className="font-bold text-red-600">{index + 1}</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('recommendedStrategies')}</h3>
          <ol className="space-y-2" role="list">
            {data.recommendedStrategies.map((strategy, index) => (
              <li
                key={strategy}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
              >
                <span className="font-bold text-primary">{index + 1}</span>
                <span>{strategy}</span>
              </li>
            ))}
          </ol>
        </div>

        {data.todayActions.length > 0 ? (
          <div>
            <h3 className="mb-3 text-sm font-semibold">{t('todayActions')}</h3>
            <StrategyExecutionList actions={data.todayActions} onStart={onStartAction} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
