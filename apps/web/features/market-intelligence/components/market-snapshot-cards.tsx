'use client';

import { useTranslations } from 'next-intl';

import type { MarketResult } from '@/features/market-intelligence';
import { cn } from '@repo/ui/lib/utils';

type SnapshotCardProps = {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

function SnapshotCard({ label, value, sub, tone = 'neutral' }: SnapshotCardProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-xl font-bold tabular-nums tracking-tight',
          tone === 'positive' && 'text-emerald-600 dark:text-emerald-400',
          tone === 'negative' && 'text-rose-600 dark:text-rose-400',
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

type MarketSnapshotCardsProps = {
  result: MarketResult;
  compact?: boolean;
};

export function MarketSnapshotCards({ result, compact }: MarketSnapshotCardsProps) {
  const t = useTranslations('marketIntel');

  const competitionTone =
    result.competitionIntensity === 'LOW'
      ? 'positive'
      : result.competitionIntensity === 'VERY_HIGH' || result.competitionIntensity === 'HIGH'
        ? 'negative'
        : 'neutral';

  const demandTone =
    result.customerDemand === 'HIGH' || result.customerDemand === 'VERY_HIGH'
      ? 'positive'
      : result.customerDemand === 'LOW'
        ? 'negative'
        : 'neutral';

  const techTone = result.technologyTrend === 'RISING' ? 'positive' : 'neutral';

  return (
    <div
      className={cn(
        'grid gap-3',
        compact ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-2 md:grid-cols-3 xl:grid-cols-5',
      )}
    >
      <SnapshotCard
        label={t('cards.marketSize')}
        value={t('cards.marketSizeValue', { tam: result.tam, sam: result.sam })}
        sub={t('cards.somSub', { som: result.som })}
      />
      <SnapshotCard
        label={t('cards.growth')}
        value={t('cards.growthValue', { rate: result.growthRate })}
        sub={t(`maturity.${result.marketMaturity.toLowerCase()}` as 'maturity.emerging')}
        tone={result.growthRate >= 10 ? 'positive' : 'neutral'}
      />
      <SnapshotCard
        label={t('cards.competition')}
        value={t(
          `competition.${result.competitionIntensity.toLowerCase()}` as 'competition.high',
        )}
        tone={competitionTone}
      />
      <SnapshotCard
        label={t('cards.demand')}
        value={t(`demand.${result.customerDemand.toLowerCase()}` as 'demand.high')}
        tone={demandTone}
      />
      <SnapshotCard
        label={t('cards.technology')}
        value={t(`trend.${result.technologyTrend.toLowerCase()}` as 'trend.rising')}
        sub={t(result.emergingTechnologyKey as 'emergingTech.aiAgents')}
        tone={techTone}
      />
    </div>
  );
}
