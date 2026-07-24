'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Target } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import { selectGoalAction } from '../actions/journey-actions';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import { WORKFLOW_GOAL_IDS, type WorkflowGoalId } from '../types';
import { AiThinkingOverlay } from './ai-thinking-overlay';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';

const GOAL_ICONS: Record<WorkflowGoalId, typeof Target> = {
  'business-viability': Target,
  'new-business': Target,
  'mvp-development': Target,
  'investment-prep': Target,
  'market-research': Target,
};

type GoalSelectionViewProps = {
  demoMode?: boolean;
};

export function GoalSelectionView({ demoMode = false }: GoalSelectionViewProps) {
  const t = useTranslations('workflow.goal');
  const tc = useTranslations('workflow.compose.goals');
  const { locked, lock } = useSubmitLock(1200);
  const analytics = useJourneyAnalytics(demoMode);
  const [overlayGoal, setOverlayGoal] = useState<WorkflowGoalId | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingGoalRef = useRef<WorkflowGoalId | null>(null);

  const handleSelect = (goalId: WorkflowGoalId) => {
    if (locked) return;
    lock();
    pendingGoalRef.current = goalId;
    setOverlayGoal(goalId);
    analytics.trackGoalSelected(goalId);
    window.setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      const input = form.querySelector<HTMLInputElement>('input[name="goalId"]');
      if (input) input.value = goalId;
      form.requestSubmit();
    }, 400);
  };

  return (
    <>
      {overlayGoal ? (
        <AiThinkingOverlay goalLabel={tc(overlayGoal)} activeStep={0} stepCount={4} />
      ) : null}

      <JourneyLayout phase="goal">
        <JourneyFade>
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{t('subtitle')}</p>
          </div>

          {demoMode ? (
            <p className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
              {t('demoBanner')}
            </p>
          ) : null}

          <form ref={formRef} action={selectGoalAction} className="sr-only" aria-hidden>
            <input type="hidden" name="goalId" defaultValue="" />
          </form>

          <ul className="mt-8 space-y-3" role="list">
            {WORKFLOW_GOAL_IDS.map((goalId) => {
              const Icon = GOAL_ICONS[goalId];
              const isSelected = overlayGoal === goalId;
              return (
                <li key={goalId}>
                  <button
                    type="button"
                    disabled={locked}
                    aria-disabled={locked}
                    onClick={() => handleSelect(goalId)}
                    className={cn(
                      'group flex w-full items-start gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left',
                      'transition-all duration-200 hover:border-primary/40 hover:bg-muted/30',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:pointer-events-none disabled:opacity-60',
                      isSelected && 'scale-[0.98] border-primary/50 ring-2 ring-primary/20',
                    )}
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{t(`options.${goalId}.title`)}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {t(`options.${goalId}.description`)}
                      </span>
                    </span>
                    <ArrowRight
                      className={cn(
                        'mt-1 size-5 shrink-0 text-muted-foreground transition-transform',
                        !locked && 'group-hover:translate-x-0.5 group-hover:text-foreground',
                      )}
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          <p className="mt-8 text-center text-xs text-muted-foreground">{t('hint')}</p>
        </JourneyFade>
      </JourneyLayout>
    </>
  );
}
