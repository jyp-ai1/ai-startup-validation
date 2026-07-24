'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { Button } from '@repo/ui';

import { getStrategyCoachState } from '../constants/decision-mock';
import { getStepGuideMeta } from '../constants/step-guides';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { AiStrategyCoach } from './ai-strategy-coach';
import { JourneyLayout } from './journey-layout';
import { WorkflowGuideCard } from './workflow-guide-card';

type StrategyWorkspaceShellProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
  demoMode?: boolean;
};

export function StrategyWorkspaceShell({
  goalId,
  template,
  demoMode = false,
}: StrategyWorkspaceShellProps) {
  const t = useTranslations('workflow.workspace');
  const tg = useTranslations('workflow.goal');
  const coachState = getStrategyCoachState(goalId);
  const activeStepId = coachState.nextActionStepId;
  const activeStep = template.steps.find((s) => s.id === activeStepId) ?? template.steps[0];
  const stepMeta = getStepGuideMeta(activeStep?.id ?? 'context');
  const progress = Math.round((1 / template.stepCount) * 100);

  return (
    <JourneyLayout phase="workspace" width="wide">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{tg(`options.${goalId}.title`)}</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('title')}</h1>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('progressLabel')}
          </p>
          <p className="text-lg font-semibold tabular-nums">{progress}%</p>
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <div className="space-y-6">
          {activeStep ? (
            <WorkflowGuideCard
              stepId={activeStep.id}
              order={activeStep.order}
              meta={stepMeta}
              active
            />
          ) : null}

          <section className="rounded-2xl border border-dashed border-border/70 bg-muted/10 p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('inputPlaceholderLabel')}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('inputPlaceholder')}</p>
          </section>
        </div>

        <AiStrategyCoach state={coachState} />
      </div>

      <div className="mt-8">
        <Button asChild size="lg" className="h-12 w-full rounded-xl">
          <Link href={demoMode ? '/auth/login?next=/workspace' : '/auth/login?next=/workspace'}>
            {demoMode ? t('ctaLogin') : t('ctaContinue')}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t('legacyHint')}{' '}
          <Link href="/dashboard" className="underline-offset-2 hover:underline">
            {t('legacyLink')}
          </Link>
        </p>
      </div>
    </JourneyLayout>
  );
}
