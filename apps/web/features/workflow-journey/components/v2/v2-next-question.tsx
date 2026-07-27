'use client';

import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import {
  type WorkflowStepId,
  getNextRecommendedStep,
} from '../../lib/v2-workflow-steps';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2NextQuestionProps = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  readOnly?: boolean;
  onGoToStep: (step: WorkflowStepId) => void;
  onReview: () => void;
  className?: string;
};

export function V2NextQuestion({
  evidence,
  reviewCount,
  hasIdea,
  readOnly = false,
  onGoToStep,
  onReview,
  className,
}: V2NextQuestionProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.nextQuestion');
  const nextStep = getNextRecommendedStep(evidence, reviewCount);

  const handleAction = () => {
    if (readOnly) {
      onGoToStep(nextStep);
      return;
    }
    if (nextStep === 'market' && hasIdea && reviewCount === 0) {
      onReview();
      return;
    }
    onGoToStep(nextStep);
  };

  return (
    <section id="next-question" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <div className="border-t border-border/40 pt-4">
        <p className="text-sm leading-relaxed">
          <span className="font-medium">{t('lead')}</span>{' '}
          {t(`question.${nextStep}`)}
        </p>
        {!readOnly ? (
          <Button type="button" size="sm" className="mt-4 rounded-lg" onClick={handleAction}>
            {t(`cta.${nextStep}`)}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
