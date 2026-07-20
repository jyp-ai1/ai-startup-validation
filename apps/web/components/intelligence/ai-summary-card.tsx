'use client';

import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { IntelligenceInsightBundle } from '@/lib/intelligence/types';
import { cn } from '@repo/ui/lib/utils';

import { AiVerdictBadge } from './ai-verdict-badge';
import { CountUp } from './count-up';

type AiSummaryCardProps = {
  insight: IntelligenceInsightBundle;
  className?: string;
};

export function AiSummaryCard({ insight, className }: AiSummaryCardProps) {
  const t = useTranslations();
  const summaryText = t(insight.summaryKey);
  const summaryLines = summaryText.split(/\.\s+/).filter(Boolean);

  return (
    <section
      className={cn(
        'll-executive-panel pl-8 pr-10 py-10 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-6 border-b border-border/50 pb-8">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-ai">
            {t('intelligence.aiRecommendation')}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">{t('intelligence.executiveSummary')}</p>
          <div className="mt-4 flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'size-4',
                  i < insight.stars ? 'fill-consulting-accent text-consulting-accent' : 'text-muted-foreground/25',
                )}
              />
            ))}
          </div>
        </div>
        <AiVerdictBadge verdict={insight.verdict} />
      </div>

      <div className="mt-8 grid gap-8 border-b border-border/50 pb-8 sm:grid-cols-3">
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('intelligence.fundingProbability')}
          </p>
          <p className="mt-2 text-intelligence-number font-semibold tabular-nums text-primary">
            <CountUp value={insight.fundingProbability} />
            <span className="text-2xl text-muted-foreground">%</span>
          </p>
        </div>
        {insight.topPercent !== null ? (
          <div>
            <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              {t('intelligence.ranking')}
            </p>
            <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
              {t('dashboard.topPercent', { percent: insight.topPercent })}
            </p>
          </div>
        ) : null}
        <div>
          <p className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
            {t('intelligence.confidence')}
          </p>
          <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">
            <CountUp value={insight.confidence} />%
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {(summaryLines.length > 1 ? summaryLines : [summaryText]).slice(0, 3).map((line, i) => (
          <p key={i} className="text-[15px] leading-relaxed text-foreground/90">
            {line.endsWith('.') ? line : `${line}.`}
          </p>
        ))}
      </div>
    </section>
  );
}
