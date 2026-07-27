'use client';

import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import {
  type WorkflowStepId,
  type WorkflowStepStatus,
  getStepStatus,
} from '../../lib/v2-workflow-steps';
import type { V2ValidationEvidence } from '../../lib/v2-validation-store';

const INLINE_STEPS: WorkflowStepId[] = ['problem', 'customer', 'market', 'competition', 'bm'];

type V2ThinkingMapStatusProps = {
  activeStep: WorkflowStepId;
  evidence: V2ValidationEvidence;
  reviewCount: number;
  onSelect: (step: WorkflowStepId) => void;
  className?: string;
};

function StatusMark({ status }: { status: WorkflowStepStatus }) {
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
  return <span className="size-3.5 shrink-0 text-center text-[10px] text-muted-foreground/70">○</span>;
}

export function V2ThinkingMapStatus({
  activeStep,
  evidence,
  reviewCount,
  onSelect,
  className,
}: V2ThinkingMapStatusProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.thinkingMap');
  const ts = useTranslations('workflow.v2.strategyWorkspace.ia.steps');

  return (
    <section id="thinking-map-status" className={cn('space-y-4', className)}>
      <h2 className="text-sm font-semibold tracking-tight">{t('title')}</h2>
      <div className="border-t border-border/40 pt-4">
        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {INLINE_STEPS.map((step) => {
            const status = getStepStatus(step, activeStep, evidence, reviewCount);
            return (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-sm transition-colors',
                    status === 'active'
                      ? 'font-medium text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <StatusMark status={status} />
                  <span>{ts(step === 'bm' ? 'bm' : step)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
