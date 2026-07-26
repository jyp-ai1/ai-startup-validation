'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { EvidenceThoughtStep } from '../../constants/decision-experience';

type EvidenceThoughtTimelineProps = {
  steps: EvidenceThoughtStep[];
  className?: string;
};

export function EvidenceThoughtTimeline({ steps, className }: EvidenceThoughtTimelineProps) {
  const t = useTranslations('workflow.founderAiPm.evidenceTimeline');

  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/80 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('title')}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t('subtitle')}</p>
      <ol className="mt-4 space-y-0" role="list">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < steps.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[11px] top-6 h-full w-px',
                  step.status === 'done' ? 'bg-primary' : 'bg-border',
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                step.status === 'done'
                  ? 'bg-primary text-primary-foreground'
                  : step.status === 'current'
                    ? 'bg-primary/20 text-primary ring-2 ring-primary'
                    : 'bg-muted text-muted-foreground',
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'current' ? 'text-primary' : 'text-foreground',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {t(`steps.${step.categoryKey}`)}
              </p>
              {step.status === 'current' ? (
                <p className="text-xs text-primary">{t('currentStep')}</p>
              ) : step.status === 'done' ? (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">{t('doneStep')}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
