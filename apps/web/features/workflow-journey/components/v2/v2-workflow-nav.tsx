'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  type WorkflowStepId,
  type WorkflowStepStatus,
  WORKFLOW_NAV_STEPS,
  getStepStatus,
} from '../../lib/v2-workflow-steps';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

type V2WorkflowNavProps = {
  activeStep: WorkflowStepId;
  evidence: V2ValidationEvidence;
  reviewCount: number;
  onSelect: (step: WorkflowStepId) => void;
  className?: string;
};

function StatusIcon({ status }: { status: WorkflowStepStatus }) {
  if (status === 'done') {
    return <Check className="size-3.5 shrink-0 text-primary" aria-hidden />;
  }
  if (status === 'active') {
    return (
      <span className="flex size-3.5 shrink-0 items-center justify-center text-[10px] text-primary">
        ▶
      </span>
    );
  }
  return <span className="size-3.5 shrink-0 text-[10px] text-muted-foreground/60">○</span>;
}

export function V2WorkflowNav({
  activeStep,
  evidence,
  reviewCount,
  onSelect,
  className,
}: V2WorkflowNavProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia');
  const ts = useTranslations('workflow.v2.strategyWorkspace.ia.steps');

  return (
    <aside className={cn('space-y-8', className)}>
      <nav aria-label={t('navLabel')}>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('navTitle')}
        </p>
        <ul className="mt-4 space-y-1">
          {WORKFLOW_NAV_STEPS.map((step) => {
            const status = getStepStatus(step, activeStep, evidence, reviewCount);
            return (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    status === 'active'
                      ? 'bg-muted/60 font-medium text-foreground'
                      : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                  )}
                >
                  <StatusIcon status={status} />
                  <span>{ts(step)}</span>
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => onSelect('review')}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                activeStep === 'review'
                  ? 'bg-muted/60 font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
              )}
            >
              <StatusIcon
                status={getStepStatus('review', activeStep, evidence, reviewCount)}
              />
              <span>{ts('review')}</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="border-t border-border/40 pt-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          {t('snippetTitle')}
        </p>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('snippet.market')}</dt>
            <dd className="text-right font-medium">
              {reviewCount > 0 ? t('snippet.marketGrowing') : t('snippet.marketUnknown')}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('snippet.competition')}</dt>
            <dd className="text-right font-medium">
              {reviewCount > 0 ? t('snippet.competitionHigh') : t('snippet.competitionUnknown')}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t('snippet.differentiation')}</dt>
            <dd className="text-right font-medium">
              {evidence.mvp?.trim()
                ? t('snippet.differentiationPartial')
                : t('snippet.differentiationNeeded')}
            </dd>
          </div>
        </dl>
      </div>
    </aside>
  );
}
