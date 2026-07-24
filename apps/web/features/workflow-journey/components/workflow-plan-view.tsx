'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import { confirmWorkflowAction } from '../actions/journey-actions';
import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { JourneyLayout } from './journey-layout';

type WorkflowPlanViewProps = {
  goalId: WorkflowGoalId;
  template: WorkflowTemplate;
};

export function WorkflowPlanView({ goalId, template }: WorkflowPlanViewProps) {
  const t = useTranslations('workflow.plan');
  const tg = useTranslations('workflow.goal');

  return (
    <JourneyLayout phase="workflow">
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

        <ol className="mt-6 space-y-3">
          {template.steps.map((step) => (
            <li
              key={step.id}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/20 px-4 py-3"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold tabular-nums">
                {step.order}
              </span>
              <div>
                <p className="font-medium text-foreground">{t(`steps.${step.id}.title`)}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{t(`steps.${step.id}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {t('readyHint', { count: template.stepCount })}
        </div>
      </div>

      <form action={confirmWorkflowAction} className="mt-8">
        <Button type="submit" size="lg" className="h-12 w-full rounded-xl text-base">
          {t('cta')}
        </Button>
      </form>
    </JourneyLayout>
  );
}
