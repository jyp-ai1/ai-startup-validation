'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ReasonChainStepId } from '../../lib/v2-reason-chain-types';

type V2ReasonChainBridgeProps = {
  steps: ReasonChainStepId[];
  activeStep: ReasonChainStepId;
  namespace?: 'smartIntake' | 'demoSample';
  className?: string;
};

export function V2ReasonChainBridge({
  steps,
  activeStep,
  namespace = 'smartIntake',
  className,
}: V2ReasonChainBridgeProps) {
  const t = useTranslations(
    `workflow.v2.strategyWorkspace.ia.thinkingUx.${namespace === 'smartIntake' ? 'reasonChain' : 'reasonChainSample'}`,
  );
  const activeIndex = steps.indexOf(activeStep);

  return (
    <ol className={cn('space-y-2 rounded-xl border border-border/40 bg-muted/5 p-4', className)}>
      {steps.map((stepId, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;
        const isFuture = index > activeIndex;
        return (
          <li
            key={stepId}
            className={cn(
              'flex gap-3 text-sm leading-relaxed',
              isFuture && 'opacity-40',
              isActive && 'font-medium text-foreground',
              isDone && 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-primary/20 text-primary',
                isFuture && 'bg-muted text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            <span>{t(`steps.${stepId}`)}</span>
          </li>
        );
      })}
    </ol>
  );
}
