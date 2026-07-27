'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type WorkflowStepId,
  WORKFLOW_NAV_STEPS,
  getNextRecommendedStep,
  getStepStatus,
  isInputStepFilled,
} from '../../lib/v2-workflow-steps';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2AiSummaryPanelProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  onGoToStep: (step: WorkflowStepId) => void;
  onReview: () => void;
  hasIdea: boolean;
  readOnly?: boolean;
  className?: string;
};

const STATUS_STEPS: WorkflowStepId[] = ['idea', 'market', 'competition', 'customer', 'bm'];

export function V2AiSummaryPanel({
  evidence,
  reviewCount,
  onGoToStep,
  onReview,
  hasIdea,
  readOnly = false,
  className,
}: V2AiSummaryPanelProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.summary');
  const ts = useTranslations('workflow.v2.strategyWorkspace.ia.steps');

  const nextStep = getNextRecommendedStep(evidence, reviewCount);

  const statusLabel = (step: WorkflowStepId): string => {
    const status = getStepStatus(step, step, evidence, reviewCount);
    if (step === 'market' || step === 'competition') {
      if (reviewCount > 0) return t('status.done');
      return t('status.pending');
    }
    if (isInputStepFilled(step, evidence)) return t('status.done');
    if (status === 'inProgress') return t('status.inProgress');
    return t('status.pending');
  };

  return (
    <aside
      className={cn(
        'flex flex-col gap-8 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:self-start',
        className,
      )}
    >
      <section>
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('reviewStatusTitle')}
        </h2>
        <dl className="mt-4 space-y-2.5">
          {STATUS_STEPS.map((step) => (
            <div key={step} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{ts(step)}</dt>
              <dd className="font-medium">{statusLabel(step)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-t border-border/40 pt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('opinionTitle')}
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <li>{reviewCount > 0 ? t('opinion.marketExists') : t('opinion.marketUnknown')}</li>
          <li>{reviewCount > 0 ? t('opinion.competitionHigh') : t('opinion.competitionUnknown')}</li>
          <li>
            {evidence.pricing?.trim() ? t('opinion.pricingSet') : t('opinion.pricingNeeded')}
          </li>
        </ul>
      </section>

      <section className="border-t border-border/40 pt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('nextTitle')}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {t(`nextHint.${nextStep}`)}
        </p>
        <Button
          type="button"
          size="sm"
          className="mt-4 w-full rounded-lg"
          onClick={() => {
            if (!readOnly && nextStep === 'market' && hasIdea && reviewCount === 0) {
              onReview();
              return;
            }
            onGoToStep(nextStep);
          }}
        >
          {t(`nextCta.${nextStep}`)}
        </Button>
      </section>
    </aside>
  );
}
