'use client';

import { useLocale, useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DecisionMemoryEntry } from '../../lib/v2-decision-memory-store';
import { buildMemoryTimeline } from '../../lib/v2-memory-timeline';
import { getAllTopicStars, getTopicJudgment } from '../../lib/v2-topic-judgment';
import { getNextAction, buildStatusLines } from '../../lib/v2-next-action-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { getReviewFreshness } from '../../lib/v2-review-dirty-state';
import { V2AiConfidenceBadge } from './v2-ai-confidence-badge';
import { StarRating } from './v2-star-rating';
import { TrendIndicator } from './v2-trend-indicator';

type V2AiEvidenceSummaryProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  lastReviewAt: Date | null;
  memoryEntries: DecisionMemoryEntry[];
  className?: string;
};

export function V2AiEvidenceSummary({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  lastReviewAt,
  memoryEntries,
  className,
}: V2AiEvidenceSummaryProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.aiSummary');
  const locale = useLocale();
  const action = getNextAction({ evidence, reviewCount, hasIdea, investigationViewed });
  const freshness = getReviewFreshness(evidence, reviewCount);
  const timeline = buildMemoryTimeline(memoryEntries, lastReviewAt, locale);
  const marketJudgment = getTopicJudgment('market');

  return (
    <aside
      className={cn(
        'flex flex-col gap-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start',
        className,
      )}
    >
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('summaryTitle')}
        </h2>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {buildStatusLines(evidence, reviewCount).map((line) => (
            <li key={line.key}>{t(`status.${line.key}.${line.done ? 'done' : 'pending'}`)}</li>
          ))}
        </ul>
      </section>

      {reviewCount > 0 ? (
        <section className="border-t border-border/40 pt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('evidenceTitle')}
          </h2>
          <ul className="mt-3 space-y-2">
            {getAllTopicStars().map(({ topic, stars, trend, starDelta, confidence }) => {
              const j = getTopicJudgment(topic);
              return (
                <li key={topic} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span>{t(`topics.${topic}`)}</span>
                    <div className="flex items-center gap-1">
                      <StarRating stars={stars} />
                      <TrendIndicator trend={trend} starDelta={starDelta} />
                    </div>
                  </div>
                  <V2AiConfidenceBadge
                    confidence={confidence}
                    level={j.confidenceLevel}
                    className="text-[10px]"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="border-t border-border/40 pt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('insightTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed">
          {reviewCount > 0 ? marketJudgment.aiInsight : t('insightEmpty')}
        </p>
        {reviewCount > 0 ? (
          <div className="mt-2">
            <V2AiConfidenceBadge
              confidence={marketJudgment.confidence}
              level={marketJudgment.confidenceLevel}
            />
          </div>
        ) : null}
      </section>

      <section className="border-t border-border/40 pt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('nextActionTitle')}
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">
          {freshness === 'stale' ? t('reviewStale') : freshness === 'current' ? t('reviewCurrent') : t('reviewNone')}
        </p>
        <p className="mt-2 text-sm leading-relaxed">{t(`nextBody.${action.kind}`)}</p>
      </section>

      {timeline.length > 0 ? (
        <section className="border-t border-border/40 pt-6">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t('timelineTitle')}
          </h2>
          <ul className="mt-3 space-y-2">
            {timeline.slice(0, 3).map((event) => (
              <li key={event.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{event.dateLabel}</span>
                {' · '}
                {event.subtitle}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </aside>
  );
}
