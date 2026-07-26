'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { ExecutiveDecisionBoardData } from '../../lib/founder-executive-decision-board';
import {
  DecisionBarChart,
  DecisionBlockBars,
  DecisionMarketChart,
  DecisionPriceSensitivityChart,
} from '../founder-ai-pm/founder-decision-board-visuals';

const DETAIL_KEYS = ['market', 'competitor', 'pricing', 'grants'] as const;

type DetailKey = (typeof DETAIL_KEYS)[number];

type V2DetailEvidenceProps = {
  data: ExecutiveDecisionBoardData;
};

export function V2DetailEvidence({ data }: V2DetailEvidenceProps) {
  const t = useTranslations('workflow.v2.detail.evidence');
  const tBoard = useTranslations('workflow.founderAiPm.executiveDecisionBoard');
  const [sectionOpen, setSectionOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<DetailKey | null>(null);

  const marketItems = [
    { label: tBoard('market.marketSize'), value: data.marketMetrics.marketSize, percent: 100 },
    { label: tBoard('market.tam'), value: data.marketMetrics.tam, percent: 85 },
    { label: tBoard('market.sam'), value: data.marketMetrics.sam, percent: 55 },
    { label: tBoard('market.som'), value: data.marketMetrics.som, percent: 30 },
  ];

  const pricePoints = [
    { price: '9,900원', score: Math.max(35, data.decisionEngine.scorePercent - 18) },
    { price: '14,900원', score: Math.max(45, data.decisionEngine.scorePercent - 6) },
    { price: data.businessCanvas.revenue, score: data.decisionEngine.scorePercent },
    { price: '29,000원', score: Math.max(40, data.decisionEngine.scorePercent - 10) },
  ];

  return (
    <section className="rounded-2xl border border-border/70 bg-muted/10 p-4 sm:p-5">
      <button
        type="button"
        className="flex w-full items-center justify-between text-sm font-semibold"
        aria-expanded={sectionOpen}
        onClick={() => setSectionOpen((open) => !open)}
      >
        {sectionOpen ? t('hide') : t('toggle')}
        <ChevronDown className={cn('size-4 transition-transform', sectionOpen && 'rotate-180')} />
      </button>

      {sectionOpen ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {DETAIL_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveKey((current) => (current === key ? null : key))}
                className={cn(
                  'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                  activeKey === key
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/70 bg-background hover:border-primary/30',
                )}
              >
                {t(`sections.${key}`)}
                {activeKey === key ? '' : ` · ${t('view')}`}
              </button>
            ))}
          </div>

          {activeKey === 'market' ? (
            <DecisionMarketChart items={marketItems} className="rounded-xl border border-border/60 p-4" />
          ) : null}

          {activeKey === 'competitor' ? (
            <div className="space-y-3 rounded-xl border border-border/60 p-4">
              {data.competitorTable.map((row) => (
                <DecisionBlockBars
                  key={row.name}
                  label={row.name}
                  blocks={row.aiStars}
                  highlight={row.isUs}
                />
              ))}
            </div>
          ) : null}

          {activeKey === 'pricing' ? (
            <DecisionPriceSensitivityChart
              className="rounded-xl border border-border/60 p-4"
              points={pricePoints}
              recommended={data.businessCanvas.revenue}
              recommendedLabel={tBoard('charts.recommendedPrice')}
            />
          ) : null}

          {activeKey === 'grants' ? (
            <DecisionBarChart
              className="rounded-xl border border-border/60 p-4"
              items={data.why.map((item) => ({
                label: tBoard(`why.dimensions.${item.key}` as 'why.dimensions.market'),
                value: item.percent,
                highlight: item.status === 'strong',
              }))}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
