'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronDown } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type ChangedField,
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
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.investigation');
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (reviewCount === 0) {
    return (
      <section id="review-board" className={cn('space-y-4', className)}>
        <h2 className="text-sm font-semibold tracking-tight">{t('titleOs')}</h2>
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
      <div>
        <h2 className="text-sm font-semibold tracking-tight">{t('titleOs')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{t('subtitleOs')}</p>
      </div>

      <V2ReviewSummary reviewCount={reviewCount} />

      <div className="rounded-xl border border-border/40">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left"
          onClick={() => setDetailsOpen((v) => !v)}
        >
          <span className="text-sm font-medium">{t('detailsToggle')}</span>
          <ChevronDown
            className={cn('size-4 text-muted-foreground transition-transform', detailsOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {detailsOpen ? (
          <div className="space-y-3 border-t border-border/40 p-4">
            {onOpenEvidenceLibrary ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full rounded-lg"
                onClick={onOpenEvidenceLibrary}
              >
                {t('actions.openLibrary')}
              </Button>
            ) : null}

            {TOPICS.map((topic) => {
              const j = getTopicJudgment(topic);
              const impact = impacts[topic];
              const needsPricingInput = topic === 'pricing' && !pricingFilled;

              return (
                <article key={topic} className="rounded-lg border border-border/40 bg-muted/5 p-3">
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

                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {needsPricingInput ? t('pricing.needsInput') : j.judgmentParagraphs[0]}
                  </p>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2 h-8 w-full rounded-lg text-xs"
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
        ) : null}
      </div>
    </section>
  );
}
