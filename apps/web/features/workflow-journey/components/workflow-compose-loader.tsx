'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { toast } from '@repo/ui';

import type { WorkflowGoalId } from '../types';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { AiThinkingOverlay } from './ai-thinking-overlay';

/** Total compose duration — PM target ~2s */
const COMPOSE_MS = 2000;
const STEP_MS = 500;
/** Hard cap — infinite loading forbidden (P0) */
const COMPOSE_TIMEOUT_MS = 10_000;

type WorkflowComposeLoaderProps = {
  goalId: WorkflowGoalId;
};

export function WorkflowComposeLoader({ goalId }: WorkflowComposeLoaderProps) {
  const tc = useTranslations('workflow.compose.goals');
  const tt = useTranslations('workflow.toast');
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulateFail = searchParams.get('simulateFail') === '1';
  const analytics = useJourneyAnalytics();
  const analyticsRef = useRef(analytics);
  analyticsRef.current = analytics;

  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const completedRef = useRef(false);

  const runCompose = useCallback(() => {
    setActiveStep(0);
    completedRef.current = false;

    if (simulateFail && attempt === 0) {
      const failTimer = window.setTimeout(() => {
        setFailed(true);
        analyticsRef.current.trackComposeFailed(attempt);
      }, 1200);
      return () => clearTimeout(failTimer);
    }

    const timeoutTimer = window.setTimeout(() => {
      if (completedRef.current) return;
      setFailed(true);
      analyticsRef.current.trackComposeFailed(attempt);
    }, COMPOSE_TIMEOUT_MS);

    const timers = [
      window.setTimeout(() => setActiveStep(1), STEP_MS),
      window.setTimeout(() => setActiveStep(2), STEP_MS * 2),
      window.setTimeout(() => setActiveStep(3), STEP_MS * 3),
      window.setTimeout(() => {
        completedRef.current = true;
        clearTimeout(timeoutTimer);
        sessionStorage.setItem('workflow_toast', '1');
        router.replace('/workflow');
      }, COMPOSE_MS),
    ];

    return () => {
      clearTimeout(timeoutTimer);
      timers.forEach(clearTimeout);
    };
  }, [attempt, router, simulateFail]);

  useEffect(() => {
    if (failed) return undefined;
    return runCompose();
  }, [failed, runCompose]);

  const handleRetry = () => {
    setFailed(false);
    setAttempt((a) => a + 1);
    analyticsRef.current.trackComposeRetried(attempt + 1);
    toast.info(tt('retrying'));
  };

  const progressPercent = Math.min(100, Math.round(((activeStep + 1) / 4) * 100));

  return (
    <AiThinkingOverlay
      goalLabel={tc(goalId)}
      activeStep={activeStep}
      stepCount={4}
      progressPercent={progressPercent}
      failed={failed}
      onRetry={handleRetry}
    />
  );
}
