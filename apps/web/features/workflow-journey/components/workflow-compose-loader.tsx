'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

import { toast } from '@repo/ui';

import type { WorkflowGoalId } from '../types';
import { AiThinkingOverlay } from './ai-thinking-overlay';

const COMPOSE_MS = 3200;
const STEP_MS = 700;

type WorkflowComposeLoaderProps = {
  goalId: WorkflowGoalId;
};

export function WorkflowComposeLoader({ goalId }: WorkflowComposeLoaderProps) {
  const tc = useTranslations('workflow.compose.goals');
  const tt = useTranslations('workflow.toast');
  const router = useRouter();
  const searchParams = useSearchParams();
  const simulateFail = searchParams.get('simulateFail') === '1';

  const [activeStep, setActiveStep] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const runCompose = useCallback(() => {
    setActiveStep(0);

    if (simulateFail && attempt === 0) {
      const failTimer = window.setTimeout(() => setFailed(true), 1200);
      return () => clearTimeout(failTimer);
    }

    const timers = [
      window.setTimeout(() => setActiveStep(1), STEP_MS),
      window.setTimeout(() => setActiveStep(2), STEP_MS * 2),
      window.setTimeout(() => setActiveStep(3), STEP_MS * 3),
      window.setTimeout(() => {
        sessionStorage.setItem('workflow_toast', '1');
        router.replace('/workflow');
      }, COMPOSE_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [attempt, router, simulateFail]);

  useEffect(() => {
    if (failed) return undefined;
    return runCompose();
  }, [failed, runCompose]);

  const handleRetry = () => {
    setFailed(false);
    setAttempt((a) => a + 1);
    toast.info(tt('retrying'));
  };

  return (
    <AiThinkingOverlay
      goalLabel={tc(goalId)}
      activeStep={activeStep}
      stepCount={4}
      failed={failed}
      onRetry={handleRetry}
    />
  );
}
