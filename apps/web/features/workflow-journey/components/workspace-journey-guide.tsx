'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

export type WorkspaceJourneyStepId =
  | 'goal'
  | 'workflow'
  | 'project'
  | 'research'
  | 'decision'
  | 'report';

const STEPS: WorkspaceJourneyStepId[] = [
  'goal',
  'workflow',
  'project',
  'research',
  'decision',
  'report',
];

type WorkspaceJourneyGuideProps = {
  activeStep: WorkspaceJourneyStepId;
  className?: string;
};

function stepStatus(
  step: WorkspaceJourneyStepId,
  active: WorkspaceJourneyStepId,
): 'done' | 'active' | 'upcoming' {
  const stepIndex = STEPS.indexOf(step);
  const activeIndex = STEPS.indexOf(active);
  if (stepIndex < activeIndex) return 'done';
  if (stepIndex === activeIndex) return 'active';
  return 'upcoming';
}

export function WorkspaceJourneyGuide({ activeStep, className }: WorkspaceJourneyGuideProps) {
  const t = useTranslations('workflow.journeyGuide');

  return (
    <aside
      className={cn(
        'rounded-2xl border border-border/70 bg-card p-4 sm:p-5 lg:sticky lg:top-24',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('title')}
      </p>
      <ol className="mt-4 space-y-1">
        {STEPS.map((step) => {
          const status = stepStatus(step, activeStep);
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm',
                status === 'active' && 'bg-primary/10 font-medium text-foreground',
                status === 'done' && 'text-muted-foreground',
                status === 'upcoming' && 'text-muted-foreground/70',
              )}
            >
              {status === 'done' ? (
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : status === 'active' ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0" aria-hidden />
              )}
              {t(`steps.${step}`)}
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
