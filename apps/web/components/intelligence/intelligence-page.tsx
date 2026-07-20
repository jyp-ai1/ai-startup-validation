'use client';

import { useTranslations } from 'next-intl';

import type { IntelligenceCategoryChip, IntelligenceInsightBundle } from '@/lib/intelligence/types';
import { cn } from '@repo/ui/lib/utils';

import { AiReasoning } from './ai-reasoning';
import { AiSummaryCard } from './ai-summary-card';
import { ConfidenceMeter } from './confidence-meter';
import { ExpertConsensus } from './expert-consensus';
import { GrowthTimeline } from './growth-timeline';
import { KeyInsights } from './key-insights';

type IntelligencePageProps = {
  eyebrow: string;
  title: string;
  description?: string;
  insight: IntelligenceInsightBundle;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  showExperts?: boolean;
  children?: React.ReactNode;
  rawData?: React.ReactNode;
  emptyState?: React.ReactNode;
  beforeData?: React.ReactNode;
  dataSectionTitle?: string;
  className?: string;
};

function CategoryChips({ categories }: { categories: IntelligenceCategoryChip[] }) {
  const t = useTranslations();
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((cat) => (
        <div
          key={cat.key}
          className="ll-consulting-card-hover px-6 py-5"
        >
          <p className="text-[13px] text-muted-foreground">{t(cat.labelKey)}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{cat.value}</p>
        </div>
      ))}
    </div>
  );
}

export function IntelligencePage({
  eyebrow,
  title,
  description,
  insight,
  actions,
  filters,
  showExperts = false,
  children,
  rawData,
  emptyState,
  beforeData,
  dataSectionTitle,
  className,
}: IntelligencePageProps) {
  const t = useTranslations();

  return (
    <div className={cn('space-y-16 pb-16 motion-safe:animate-in motion-safe:fade-in', className)}>
      <header className="ll-section-rule space-y-3">
        <div className="ll-accent-rule" />
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-intelligence-section font-semibold tracking-tight">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-base text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </header>

      <AiSummaryCard insight={insight} />

      <div className="grid gap-6 xl:grid-cols-2">
        <KeyInsights insightKeys={insight.insightKeys} />
        <AiReasoning items={insight.reasoning} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
        <ConfidenceMeter value={insight.confidence} />
        {showExperts && insight.experts.length > 0 ? (
          <ExpertConsensus experts={insight.experts} />
        ) : insight.categories && insight.categories.length > 0 ? (
          <CategoryChips categories={insight.categories} />
        ) : null}
      </div>

      {showExperts && insight.experts.length > 0 ? (
        <section className="space-y-6">
          <h2 className="text-lg font-semibold tracking-tight">{t('intelligence.expertTitle')}</h2>
          <ExpertConsensus experts={insight.experts} />
        </section>
      ) : null}

      {filters}

      {emptyState ?? (
        <>
          {beforeData}

          {children ? (
            <section className="space-y-6">
              <div className="ll-section-rule space-y-2">
                <div className="ll-accent-rule" />
                <h2 className="text-[18px] font-semibold tracking-tight">
                  {dataSectionTitle ?? t('intelligence.dataCards')}
                </h2>
              </div>
              {children}
            </section>
          ) : null}

          {insight.timeline.length > 0 ? <GrowthTimeline points={insight.timeline} /> : null}

          {rawData ? (
            <section className="space-y-4">
              <div className="ll-section-rule space-y-2">
                <div className="ll-accent-rule" />
                <h2 className="text-[18px] font-semibold tracking-tight">{t('intelligence.rawData')}</h2>
              </div>
              {rawData}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
