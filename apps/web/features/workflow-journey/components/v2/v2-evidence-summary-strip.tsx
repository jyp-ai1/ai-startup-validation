'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { InvestigationTopic } from '../../lib/v2-next-action-engine';
import { getAllTopicStars } from '../../lib/v2-topic-judgment';
import { StarRating } from './v2-star-rating';
import { TrendIndicator } from './v2-trend-indicator';

type V2EvidenceSummaryStripProps = {
  reviewCount: number;
  onOpenTopic: (topic: InvestigationTopic) => void;
  className?: string;
};

const TOPICS: InvestigationTopic[] = ['market', 'competition', 'pricing', 'differentiation'];

export function V2EvidenceSummaryStrip({
  reviewCount,
  onOpenTopic,
  className,
}: V2EvidenceSummaryStripProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.evidenceStrip');

  if (reviewCount === 0) return null;

  const stars = getAllTopicStars();

  return (
    <section className={cn('space-y-3', className)}>
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('todayLabel')}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TOPICS.map((topic) => {
          const item = stars.find((s) => s.topic === topic)!;
          return (
            <button
              key={topic}
              type="button"
              onClick={() => onOpenTopic(topic)}
              className="rounded-xl border border-border/40 bg-muted/10 px-3 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/[0.03]"
            >
              <p className="text-xs font-medium text-muted-foreground">{t(`topics.${topic}`)}</p>
              <div className="mt-1.5 flex items-center gap-1.5">
                <StarRating stars={item.stars} />
                <TrendIndicator trend={item.trend} starDelta={item.starDelta} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {item.confidence}% · {t('evidenceCount', { count: item.evidenceCount })}
              </p>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{t('hint')}</p>
    </section>
  );
}
