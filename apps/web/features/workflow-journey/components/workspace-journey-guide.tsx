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

function statusLabelKey(status: 'done' | 'active' | 'upcoming'): 'done' | 'current' | 'next' {
  if (status === 'done') return 'done';
  if (status === 'active') return 'current';
  return 'next';
}

export function WorkspaceJourneyGuide({ activeStep, className }: WorkspaceJourneyGuideProps) {
  const t = useTranslations('workflow.journeyGuide');
  const ts = useTranslations('workflow.journeyGuide.status');

  const nextStep = STEPS[STEPS.indexOf(activeStep) + 1];

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
      {nextStep ? (
        <p className="mt-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
          {ts('nextUp')}: {t(`steps.${nextStep}`)}
        </p>
      ) : null}
      <ol className="mt-4 space-y-1">
        {STEPS.map((step) => {
          const status = stepStatus(step, activeStep);
          const labelKey = statusLabelKey(status);
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm',
                status === 'active' && 'bg-primary/10 font-medium text-foreground ring-1 ring-primary/20',
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
              <span className="min-w-0 flex-1 truncate">{t(`steps.${step}`)}</span>
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  status === 'done' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                  status === 'active' && 'bg-primary/15 text-primary',
                  status === 'upcoming' && 'bg-muted text-muted-foreground',
                )}
              >
                {ts(labelKey)}
              </span>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
