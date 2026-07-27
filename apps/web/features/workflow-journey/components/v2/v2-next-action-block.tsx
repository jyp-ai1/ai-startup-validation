'use client';

import { useTranslations } from 'next-intl';
import { Check, Clock } from 'lucide-react';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { getNextActionMeta } from '../../lib/v2-next-action-meta';
import { buildStatusLines, getNextAction } from '../../lib/v2-next-action-engine';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';
import { StarRating } from './v2-star-rating';

type V2NextActionBlockProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
  readOnly?: boolean;
  onStartReview: () => void;
  onReReview: () => void;
  onFillPricing: () => void;
  onFillIdea: () => void;
  onViewInvestigation: () => void;
  onCustomerValidation: () => void;
  className?: string;
};

export function V2NextActionBlock({
  evidence,
  reviewCount,
  hasIdea,
  investigationViewed,
  readOnly = false,
  onStartReview,
  onReReview,
  onFillPricing,
  onFillIdea,
  onViewInvestigation,
  onCustomerValidation,
  className,
}: V2NextActionBlockProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextAction');
  const ts = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextAction.status');

  const action = getNextAction({ evidence, reviewCount, hasIdea, investigationViewed });
  const meta = getNextActionMeta(action.kind);
  const statusLines = buildStatusLines(evidence, reviewCount);
  const why = t(`why.${action.kind}`);

  const handleCta = () => {
    switch (action.kind) {
      case 'fill-idea':
        onFillIdea();
        break;
      case 'start-review':
        onStartReview();
        break;
      case 're-review':
        onReReview();
        break;
      case 'fill-pricing':
        onFillPricing();
        break;
      case 'view-investigation':
        onViewInvestigation();
        break;
      case 'customer-validation':
        onCustomerValidation();
        break;
      default:
        break;
    }
  };

  return (
    <section id="next-action" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('currentStateTitle')}</h2>
      <div className="border-t border-border/40 pt-4">
        <ul className="space-y-1.5 text-sm">
          {statusLines.map((line) => (
            <li key={line.key} className="flex items-center gap-2 text-muted-foreground">
              {line.done ? (
                <Check className="size-3.5 shrink-0 text-primary" aria-hidden />
              ) : (
                <span className="size-3.5 shrink-0 text-center text-[10px]">○</span>
              )}
              <span className={line.done ? 'text-foreground' : undefined}>
                {ts(`${line.key}.${line.done ? 'done' : 'pending'}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-4">
        <h3 className="text-sm font-semibold tracking-tight">{t(`body.${action.kind}`)}</h3>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <StarRating stars={meta.priorityStars} />
          <span className="flex items-center gap-1 font-medium text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {t('timeValue', { minutes: meta.estimatedMinutes })}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">{t('whyLabel')}</span>
          {' '}
          {why}
        </p>

        <p className="text-xs text-primary">{t(`effect.${meta.expectedEffectKey}`)}</p>

        {!readOnly ? (
          <Button type="button" size="sm" className="rounded-lg" onClick={handleCta}>
            {t(`cta.${action.kind}`)}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
