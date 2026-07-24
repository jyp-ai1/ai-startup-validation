'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowRight, Sparkles } from 'lucide-react';

import { Button } from '@repo/ui';

import type { WorkflowGoalId, WorkflowTemplate } from '../types';
import { JourneyLayout } from './journey-layout';

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
  const firstStep = template.steps[0];
  const progress = Math.round((1 / template.stepCount) * 100);

  return (
    <JourneyLayout phase="workspace">
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

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="rounded-2xl border border-border/70 bg-card p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('currentStep', { current: 1, total: template.stepCount })}
          </p>
          <h2 className="mt-2 text-lg font-semibold">
            {firstStep ? t(`steps.${firstStep.id}.title`) : t('stepFallback')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {firstStep ? t(`steps.${firstStep.id}.body`) : t('stepFallbackBody')}
          </p>
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {t('emptyState')}
          </div>
        </section>

        <aside className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-4" aria-hidden />
            <p className="text-sm font-semibold">{t('guideTitle')}</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">{t('guideBody')}</p>
          <p className="mt-4 text-sm font-medium text-foreground">{t('nextAction')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('nextActionDetail')}</p>
        </aside>
      </div>

      <div className="mt-8">
        {demoMode ? (
          <Button asChild size="lg" className="h-12 w-full rounded-xl">
            <Link href="/auth/login?next=/workspace">
              {t('ctaLogin')}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="lg" className="h-12 w-full rounded-xl">
            <Link href="/auth/login?next=/workspace">
              {t('ctaContinue')}
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
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
