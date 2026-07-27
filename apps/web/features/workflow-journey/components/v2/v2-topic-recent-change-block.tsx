'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { TopicRecentChange, EvidenceTrend } from '../../lib/v2-topic-judgment';
import { StarRating } from './v2-star-rating';
import { TrendIndicator } from './v2-trend-indicator';

type V2TopicRecentChangeBlockProps = {
  change: TopicRecentChange;
  currentStars: number;
  trend: EvidenceTrend;
  className?: string;
};

export function V2TopicRecentChangeBlock({
  change,
  currentStars,
  trend,
  className,
}: V2TopicRecentChangeBlockProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.recentChange');

  return (
    <div className={cn('rounded-lg border border-border/40 bg-muted/10 p-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t('title')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{change.changedAtLabel}</p>
      <div className="mt-2 flex items-center gap-2 text-sm">
        <StarRating stars={change.previousStars} className="text-xs" />
        <span className="text-muted-foreground">↓</span>
        <span className="text-xs text-muted-foreground">{t('today')}</span>
        <StarRating stars={currentStars} className="text-xs" />
        <TrendIndicator trend={trend} starDelta={currentStars - change.previousStars} />
      </div>
      <div className="mt-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('reason')}
        </p>
        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
          {change.reasonBullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
