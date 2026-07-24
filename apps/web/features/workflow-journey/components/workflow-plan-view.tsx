'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Sparkles } from 'lucide-react';

import { Button, toast } from '@repo/ui';

import { confirmWorkflowAction } from '../actions/journey-actions';
import { getStepGuideMeta } from '../constants/step-guides';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';
import { WorkflowGuideCard } from './workflow-guide-card';

type WorkflowPlanViewProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
};

export function WorkflowPlanView({ goalId, template }: WorkflowPlanViewProps) {
  const t = useTranslations('workflow.plan');
  const tg = useTranslations('workflow.goal');
  const tt = useTranslations('workflow.toast');
  const { locked, lock } = useSubmitLock(1000);
  const analytics = useJourneyAnalytics();
  const firstStep = template.steps[0];

  useEffect(() => {
    analytics.trackWorkflowCreated(goalId, template.stepCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on plan mount
  }, [goalId, template.stepCount]);

  useEffect(() => {
    if (sessionStorage.getItem('workflow_toast') === '1') {
      sessionStorage.removeItem('workflow_toast');
      toast.success(tt('workflowReady'));
    }
  }, [tt]);

  return (
    <JourneyLayout phase="workflow" width="wide">
      <JourneyFade>
        <div className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-medium text-primary">{t('aiLabel')}</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{t('title')}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('goalContext', { goal: tg(`options.${goalId}.title`) })}
              </p>
            </div>
          </div>

          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{t('intro')}</p>

          {firstStep ? (
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t('currentStepLabel')}
              </p>
              <WorkflowGuideCard
                stepId={firstStep.id}
                order={firstStep.order}
                meta={getStepGuideMeta(firstStep.id)}
                active
              />
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('upcomingLabel')}
            </p>
            {template.steps.slice(1).map((step) => (
              <WorkflowGuideCard
                key={step.id}
                stepId={step.id}
                order={step.order}
                meta={getStepGuideMeta(step.id)}
                compact
              />
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('forecast.title')}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(['today', 'tomorrow', 'week'] as const).map((key) => (
                <div key={key} className="rounded-xl bg-background px-2 py-3">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {t(`forecast.${key}Label`)}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {t(`forecast.${key}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            {t('readyHint', { count: template.stepCount })}
          </div>
        </div>

        <form
          action={confirmWorkflowAction}
          className="mt-8"
          onSubmit={() => {
            if (locked) return;
            lock();
            sessionStorage.setItem('workspace_toast', '1');
          }}
        >
          <Button
            type="submit"
            size="lg"
            disabled={locked}
            className="h-12 w-full rounded-xl text-base disabled:pointer-events-none"
          >
            {t('cta')}
          </Button>
        </form>
      </JourneyFade>
    </JourneyLayout>
  );
}
