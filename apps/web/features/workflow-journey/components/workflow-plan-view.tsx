'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Sparkles } from 'lucide-react';

import { Button, toast } from '@repo/ui';

import { confirmWorkflowAction } from '../actions/journey-actions';
import { useJourneyAnalytics } from '../hooks/use-journey-analytics';
import { useSubmitLock } from '../hooks/use-submit-lock';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { JourneyFade } from './journey-fade';
import { JourneyLayout } from './journey-layout';
import { WorkflowOutcomesPanel } from './workflow-outcomes-panel';
import { WorkflowStackBadges } from './workflow-stack-badges';
import { WorkflowWhyPanel } from './workflow-why-panel';

const STRATEGY_PHASES = ['discover', 'validate', 'decide', 'execute'] as const;

type WorkflowPlanViewProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
};

export function WorkflowPlanView({ goalId, template }: WorkflowPlanViewProps) {
  const t = useTranslations('workflow.confirmation');
  const tg = useTranslations('workflow.goal');
  const tt = useTranslations('workflow.toast');
  const { locked, lock } = useSubmitLock(2000);
  const analytics = useJourneyAnalytics();

  useEffect(() => {
    analytics.trackWorkflowCreated(goalId, template.stepCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-background p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-medium text-primary">{t('eyebrow')}</p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t('title')}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('goalContext', { goal: tg(`options.${goalId}.title`) })}
                </p>
              </div>
            </div>

            <p className="mt-6 text-lg font-semibold text-foreground">{t('subtitle')}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('aiNote')}</p>

            <WorkflowStackBadges className="mt-5" />

            <WorkflowWhyPanel className="mt-5" />

            <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                {t('recommendationLabel')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-foreground">{t('rationale1')}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t('rationale2')}</p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('outcomesTitle')}</p>
              <WorkflowOutcomesPanel className="mt-3" />
            </div>

            <ol className="mt-6 space-y-3" role="list">
              {STRATEGY_PHASES.map((key, index) => (
                <li
                  key={key}
                  className="relative flex gap-4 rounded-xl border border-border/60 bg-background px-4 py-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-500"
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t(`phases.${key}.title`)}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{t(`phases.${key}.desc`)}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground">
              <Clock className="size-4" aria-hidden />
              {t('eta', { minutes: 20 })}
            </div>
          </div>

          <form
            action={confirmWorkflowAction}
            className="mt-8"
            onSubmit={() => {
              if (locked) return;
              lock();
              sessionStorage.removeItem('ll_project_started');
              sessionStorage.setItem('workspace_toast', '1');
            }}
          >
            <Button
              type="submit"
              size="lg"
              disabled={locked}
              className="h-14 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/20 disabled:pointer-events-none"
            >
              {t('cta')}
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">{t('ctaHint')}</p>
          </form>
        </div>
      </JourneyFade>
    </JourneyLayout>
  );
}
