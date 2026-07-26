'use client';

import { Check, Circle, Play } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

export type WorkspaceJourneyStepId =
  | 'goal'
  | 'project'
  | 'research'
  | 'analysis'
  | 'judgment'
  | 'strategy'
  | 'execution'
  | 'complete';

const STEP_NUMBERS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'] as const;

const STEPS: WorkspaceJourneyStepId[] = [
  'goal',
  'project',
  'research',
  'analysis',
  'judgment',
  'strategy',
  'execution',
  'complete',
];

type WorkspaceJourneyGuideProps = {
  activeStep: WorkspaceJourneyStepId;
  companyProgressPercent?: number;
  weeklyGrowthPercent?: number;
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

export function WorkspaceJourneyGuide({
  activeStep,
  companyProgressPercent,
  weeklyGrowthPercent,
  className,
}: WorkspaceJourneyGuideProps) {
  const t = useTranslations('workflow.journeyGuide');
  const activeIndex = STEPS.indexOf(activeStep);
  const stepProgress = Math.round((activeIndex / Math.max(1, STEPS.length - 1)) * 100);
  const progressPercent =
    companyProgressPercent != null
      ? Math.max(0, Math.min(100, Math.round(companyProgressPercent)))
      : stepProgress;
  const filledBlocks = Math.round((progressPercent / 100) * 8);
  const weeklyDelta = weeklyGrowthPercent != null ? Math.round(weeklyGrowthPercent) : null;

  return (
    <nav
      className={cn(
        'rounded-2xl border border-border/70 bg-card p-4 sm:p-5',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {t('title')}
      </p>

      <div className="mt-3">
        <p className="text-xs text-muted-foreground">{t('growth.label')}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums">{progressPercent}%</p>
        {weeklyDelta != null && weeklyDelta > 0 ? (
          <p className="mt-0.5 text-xs font-semibold text-emerald-600">
            {t('growth.weekly', { delta: weeklyDelta })}
          </p>
        ) : null}
        <div className="mt-2 flex gap-0.5" aria-hidden>
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-sm',
                index < filledBlocks ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </div>
      <ol className="mt-4 space-y-0.5" role="list">
        {STEPS.map((step, index) => {
          const status = stepStatus(step, activeStep);
          return (
            <li
              key={step}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm',
                status === 'active' && 'bg-primary/10 font-semibold text-foreground ring-1 ring-primary/25',
                status === 'done' && 'text-muted-foreground',
                status === 'upcoming' && 'text-muted-foreground/60',
              )}
            >
              {status === 'done' ? (
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
              ) : status === 'active' ? (
                <Play className="size-3.5 shrink-0 fill-primary text-primary" aria-hidden />
              ) : (
                <Circle className="size-4 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">
                {STEP_NUMBERS[index]} {t(`steps.${step}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
