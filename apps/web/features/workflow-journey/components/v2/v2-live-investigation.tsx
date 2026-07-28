'use client';

import { useTranslations } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { LiveInvestigationStepId } from '../../lib/v2-investigation-types';

type V2LiveInvestigationProps = {
  steps: LiveInvestigationStepId[];
  completedCount: number;
  namespace?: 'investigation' | 'investigationSample';
  className?: string;
};

export function V2LiveInvestigation({
  steps,
  completedCount,
  namespace = 'investigation',
  className,
}: V2LiveInvestigationProps) {
  const t = useTranslations(`workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace}`);

  return (
    <div className={cn('rounded-xl border border-primary/25 bg-primary/[0.04] p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        {t('live.title')}
      </p>
      <ul className="mt-3 space-y-2">
        {steps.map((stepId, index) => {
          const isDone = index < completedCount;
          const isActive = index === completedCount;
          return (
            <li
              key={stepId}
              className={cn(
                'flex items-center gap-2 text-sm',
                !isDone && !isActive && 'opacity-40',
                isActive && 'font-medium text-foreground',
              )}
            >
              {isDone ? (
                <Check className="size-4 shrink-0 text-primary" aria-hidden />
              ) : isActive ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <span className="size-4 shrink-0 rounded-full border border-muted-foreground/30" />
              )}
              <span>{t(`live.steps.${stepId}`)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
