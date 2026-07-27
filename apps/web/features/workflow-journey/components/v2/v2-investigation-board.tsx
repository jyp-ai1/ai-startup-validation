'use client';

import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type ChangedField,
  type ImpactLevel,
  getImpactAnalysis,
} from '../../lib/v2-impact-analysis';
import type { InvestigationTopic } from '../../lib/v2-next-action-engine';
import { getTopicJudgment } from '../../lib/v2-topic-judgment';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { isEvidenceFieldFilled } from '../../lib/v2-validation-store';
import { V2AiConfidenceBadge } from './v2-ai-confidence-badge';
import { StarRating } from './v2-star-rating';
import { TrendIndicator } from './v2-trend-indicator';
import { V2ReviewSummary } from './v2-review-summary';

type V2InvestigationBoardProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  isStale: boolean;
  changedField: ChangedField | null;
  readOnly?: boolean;
  onOpenTopic: (topic: InvestigationTopic) => void;
  onFillPricing: () => void;
  onOpenEvidenceLibrary?: () => void;
  className?: string;
};

const TOPICS: InvestigationTopic[] = ['market', 'competition', 'pricing', 'differentiation'];

export function V2InvestigationBoard({
  evidence,
  reviewCount,
  isStale,
  changedField,
  readOnly = false,
  onOpenTopic,
  onFillPricing,
  onOpenEvidenceLibrary,
  className,
}: V2InvestigationBoardProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.investigation');

  if (reviewCount === 0) {
    return (
      <section id="review-board" className={cn('space-y-4', className)}>
        <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
        <div className="border-t border-border/40 pt-4">
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        </div>
      </section>
    );
  }

  const impacts = getImpactAnalysis(changedField, isStale);
  const pricingFilled = isEvidenceFieldFilled('pricing', evidence);

  return (
    <section id="review-board" className={cn('space-y-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t('subtitleThreeLine')}</p>
        </div>
        {onOpenEvidenceLibrary ? (
          <Button type="button" size="sm" variant="outline" className="shrink-0 rounded-lg" onClick={onOpenEvidenceLibrary}>
            {t('actions.openLibrary')}
          </Button>
        ) : null}
      </div>

      <div className="space-y-4 border-t border-border/40 pt-4">
        {TOPICS.map((topic) => {
          const j = getTopicJudgment(topic);
          const impact = impacts[topic];
          const needsPricingInput = topic === 'pricing' && !pricingFilled;
          const learned = needsPricingInput ? t('pricing.needsInput') : j.judgmentParagraphs[0] ?? j.verdict;
          const why = j.recentChange?.reasonBullets[0] ?? j.evidenceBullets[0] ?? j.aiInsight;
          const doAction = j.nextAction;

          return (
            <article key={topic} className="rounded-xl border border-border/40 bg-muted/5 p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold">{t(`sections.${topic}`)}</h3>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <StarRating stars={needsPricingInput ? 1 : j.stars} />
                    <TrendIndicator trend={j.trend} starDelta={j.starDelta} />
                  </div>
                  <V2AiConfidenceBadge confidence={j.confidence} level={j.confidenceLevel} />
                </div>
              </div>

              {impact !== 'none' && isStale ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="size-3.5" aria-hidden />
                  {t(`impact.${impact}`)}
                </p>
              ) : null}

              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('card.learned')}
                  </dt>
                  <dd className="mt-1 font-medium">{learned}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('card.why')}
                  </dt>
                  <dd className="mt-1 text-muted-foreground">{why}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t('card.do')}
                  </dt>
                  <dd className="mt-1">{doAction}</dd>
                </div>
              </dl>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-4 w-full rounded-lg"
                onClick={() =>
                  needsPricingInput && !readOnly ? onFillPricing() : onOpenTopic(topic)
                }
              >
                {needsPricingInput ? t('actions.input') : t('actions.viewJudgment')}
              </Button>
            </article>
          );
        })}
      </div>

      <V2ReviewSummary reviewCount={reviewCount} className="mt-4" />
    </section>
  );
}
