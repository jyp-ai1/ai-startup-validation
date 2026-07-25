'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Target } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { cn } from '@repo/ui/lib/utils';

import { saveGoalAction } from '../actions/journey-actions';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import { WORKFLOW_GOAL_IDS, type WorkflowGoalId } from '../types';
import { AiThinkingOverlay } from './ai-thinking-overlay';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';

const GOAL_TIMEOUT_MS = 10_000;

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
  const tg = useTranslations('workflow.goal.thinking');
  const tc = useTranslations('workflow.compose.goals');
  const router = useRouter();
  const { locked, lock, resetLock } = useSubmitLock(12_000);
  const analytics = useJourneyAnalytics(demoMode);
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  const [overlayGoal, setOverlayGoal] = useState<WorkflowGoalId | null>(null);
  const [failed, setFailed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  const clearGoalTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleSelect = useCallback(
    async (goalId: WorkflowGoalId) => {
      if (locked) return;
      lock();
      setFailed(false);
      setActiveStep(0);
      setOverlayGoal(goalId);
      analyticsRef.current.trackGoalSelected(goalId);

      clearGoalTimeout();
      timeoutRef.current = window.setTimeout(() => {
        setFailed(true);
      }, GOAL_TIMEOUT_MS);

      const stepTimer = window.setInterval(() => {
        setActiveStep((s) => Math.min(3, s + 1));
      }, 450);

      try {
        const result = await saveGoalAction(goalId);
        window.clearInterval(stepTimer);
        clearGoalTimeout();

        if (!result.ok) {
          setFailed(true);
          return;
        }

        setActiveStep(3);
        router.push('/workflow?compose=1');
      } catch (error) {
        window.clearInterval(stepTimer);
        clearGoalTimeout();
        setFailed(true);
        if (process.env.NODE_ENV === 'development') {
          console.error('[GoalSelection] saveGoalAction failed', error);
        }
      }
    },
    [clearGoalTimeout, lock, locked, router],
  );

  const handleRetry = () => {
    if (!overlayGoal) return;
    resetLock();
    setFailed(false);
    void handleSelect(overlayGoal);
  };

  const progressPercent = overlayGoal
    ? Math.min(100, Math.round(((activeStep + 1) / 4) * 100))
    : 0;

  return (
    <>
      {overlayGoal ? (
        <AiThinkingOverlay
          goalLabel={tc(overlayGoal)}
          titleOverride={tg('title')}
          stepLabels={[tg('steps.market'), tg('steps.coach'), tg('steps.build'), tg('steps.ready')]}
          activeStep={activeStep}
          stepCount={4}
          progressPercent={progressPercent}
          failed={failed}
          onRetry={handleRetry}
        />
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

          <ul className="mt-8 space-y-3" role="list">
            {WORKFLOW_GOAL_IDS.map((goalId) => {
              const Icon = GOAL_ICONS[goalId];
              const isSelected = overlayGoal === goalId;
              const isDisabled = locked;
              return (
                <li key={goalId}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    aria-disabled={isDisabled}
                    onClick={() => void handleSelect(goalId)}
                    className={cn(
                      'group flex w-full items-start gap-4 rounded-2xl border border-border/70 bg-card p-4 text-left',
                      'transition-all duration-200 hover:border-primary/40 hover:bg-muted/30',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'disabled:pointer-events-none disabled:opacity-50',
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
                        !isDisabled && 'group-hover:translate-x-0.5 group-hover:text-foreground',
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
