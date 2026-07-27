'use client';

import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

type V2DirtyStateFlowProps = {
  changedFieldLabel: string | null;
  className?: string;
};

const STEPS = ['inputChanged', 'thinkingChanged', 'reviewStale', 'reReviewNeeded'] as const;

export function V2DirtyStateFlow({ changedFieldLabel, className }: V2DirtyStateFlowProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.dirtyState.flow');

  return (
    <div className={cn('space-y-2', className)}>
      {changedFieldLabel ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
          {t('fieldChanged', { field: changedFieldLabel })}
        </p>
      ) : null}
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        {STEPS.map((step, index) => (
          <li key={step} className="flex items-center gap-1.5">
            <span
              className={cn(
                'rounded-full px-2 py-0.5 transition-colors motion-safe:animate-in motion-safe:fade-in',
                index === STEPS.length - 1
                  ? 'bg-amber-500/15 font-medium text-amber-700 dark:text-amber-300'
                  : 'bg-muted/60',
              )}
              style={{ animationDelay: `${index * 120}ms` }}
            >
              {t(step)}
            </span>
            {index < STEPS.length - 1 ? (
              <ArrowRight className="size-3 shrink-0 opacity-40" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
