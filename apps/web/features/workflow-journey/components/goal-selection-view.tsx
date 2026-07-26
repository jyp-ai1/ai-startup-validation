'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { useRouter } from '@/i18n/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { saveGoalAction } from '../actions/journey-actions';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import { WORKFLOW_GOAL_IDS, type WorkflowGoalId } from '../types';
import { AiThinkingOverlay } from './ai-thinking-overlay';
import { AiPmOfficeChat } from './ai-state/ai-pm-office-chat';
import { GoalIntakePanel } from './goal-intake-panel';
import { DecisionBoardPlaceholder, FounderWorkspaceLayout } from './founder-workspace-layout';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';

const GOAL_TIMEOUT_MS = 10_000;
const THINKING_STEP_COUNT = 7;
const RECOMMENDED_GOAL: WorkflowGoalId = 'business-viability';

const GOAL_THINKING_STEP_KEYS = [
  'marketResearch',
  'competitorAnalysis',
  'customerAnalysis',
  'businessModel',
  'risk',
  'strategy',
  'projectCreate',
] as const;

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
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const timeoutRef = useRef<number | null>(null);
  const goalButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const clearGoalTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleSelect = useCallback(
    async (goalId: WorkflowGoalId, options?: { recommended?: boolean }) => {
      if (locked) return;
      lock();
      setFailed(false);
      setActiveStep(0);
      setOverlayGoal(goalId);
      analyticsRef.current.trackGoalSelected(goalId, options);

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('ll_goal_immersion', '1');
      }

      clearGoalTimeout();
      timeoutRef.current = window.setTimeout(() => {
        setFailed(true);
      }, GOAL_TIMEOUT_MS);

      const stepTimer = window.setInterval(() => {
        setActiveStep((s) => Math.min(THINKING_STEP_COUNT - 1, s + 1));
      }, 380);

      try {
        const result = await saveGoalAction(goalId);
        window.clearInterval(stepTimer);
        clearGoalTimeout();

        if (!result.ok) {
          setFailed(true);
          return;
        }

        setActiveStep(THINKING_STEP_COUNT - 1);
        router.push('/workflow');
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

  useEffect(() => {
    if (overlayGoal) return;

    function onKeyDown(event: KeyboardEvent) {
      if (locked) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setFocusedIndex((index) => {
          const next = Math.min(WORKFLOW_GOAL_IDS.length - 1, index + 1);
          goalButtonRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setFocusedIndex((index) => {
          const next = Math.max(0, index - 1);
          goalButtonRefs.current[next]?.focus();
          return next;
        });
      } else if (event.key === 'Enter') {
        const active = document.activeElement;
        const isGoalButton = goalButtonRefs.current.some((button) => button === active);
        if (!isGoalButton) {
          event.preventDefault();
          void handleSelect(WORKFLOW_GOAL_IDS[focusedIndex]!);
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusedIndex, handleSelect, locked, overlayGoal]);

  const thinkingStepLabels = GOAL_THINKING_STEP_KEYS.map((key) => tg(`steps.${key}`));

  const progressPercent = overlayGoal
    ? Math.min(100, Math.round(((activeStep + 1) / THINKING_STEP_COUNT) * 100))
    : 0;

  const chatMessages = useMemo(
    () => [
      { role: 'ai' as const, text: t('officeChat.greeting') },
      { role: 'ai' as const, text: t('officeChat.prompt') },
      { role: 'ai' as const, text: t('officeChat.recommendedHint') },
    ],
    [t],
  );

  const goalFooter = (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('officeChat.chooseLabel')}
      </p>
      <Button
        type="button"
        className="h-11 w-full justify-between rounded-xl font-semibold"
        disabled={locked}
        onClick={() => void handleSelect(RECOMMENDED_GOAL, { recommended: true })}
      >
        <span>{t('recommended.cta')}</span>
        <ArrowRight className="size-4" aria-hidden />
      </Button>
      <ul className="max-h-[280px] space-y-2 overflow-y-auto pr-1" role="list">
        {WORKFLOW_GOAL_IDS.map((goalId, index) => {
          const isSelected = overlayGoal === goalId;
          const isDisabled = locked;
          const isRecommended = goalId === RECOMMENDED_GOAL;
          return (
            <li key={goalId}>
              <button
                ref={(node) => {
                  goalButtonRefs.current[index] = node;
                }}
                type="button"
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-label={
                  isRecommended
                    ? `${t('recommended.label')}: ${t(`options.${goalId}.title`)}`
                    : t(`options.${goalId}.title`)
                }
                onFocus={() => setFocusedIndex(index)}
                onClick={() => void handleSelect(goalId)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background px-3 py-2.5 text-left text-sm',
                  'transition-colors hover:border-primary/40 hover:bg-muted/30',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  'disabled:pointer-events-none disabled:opacity-50',
                  isSelected && 'border-primary/50 ring-2 ring-primary/20',
                  isRecommended && !isSelected && 'border-primary/25',
                  focusedIndex === index && !isSelected && 'ring-2 ring-ring/40',
                )}
              >
                <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-foreground">{t(`options.${goalId}.title`)}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {t(`options.${goalId}.description`)}
                  </span>
                </span>
                <ArrowRight
                  className={cn(
                    'size-4 shrink-0 text-muted-foreground transition-transform',
                    !isDisabled && 'group-hover:translate-x-0.5 group-hover:text-foreground',
                  )}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      {demoMode ? (
        <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
          {t('demoBanner')}
        </p>
      ) : null}
      <GoalIntakePanel optional />
      <p className="text-center text-xs text-muted-foreground">{t('keyboardHint')}</p>
    </div>
  );

  return (
    <>
      {overlayGoal ? (
        <AiThinkingOverlay
          goalLabel={tc(overlayGoal)}
          titleOverride={tg('title')}
          stepLabels={thinkingStepLabels}
          activeStep={activeStep}
          stepCount={THINKING_STEP_COUNT}
          progressPercent={progressPercent}
          failed={failed}
          onRetry={handleRetry}
        />
      ) : null}

      <JourneyLayout phase="goal" variant="intelligence">
        <JourneyFade>
          <FounderWorkspaceLayout
            activeStep="goal"
            center={<AiPmOfficeChat messages={chatMessages} footer={goalFooter} />}
            right={<DecisionBoardPlaceholder />}
          />
        </JourneyFade>
      </JourneyLayout>
    </>
  );
}
