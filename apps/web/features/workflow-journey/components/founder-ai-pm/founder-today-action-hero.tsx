'use client';

import { ArrowRight, Clock, Sparkles, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { getDecisionStages } from '../../constants/decision-experience';
import { computeFounderAiPmBrief } from '../../lib/founder-ai-pm-engine';
import type { WorkflowGoalId } from '../../types';

type FounderTodayActionHeroProps = {
  goalId: WorkflowGoalId;
  confidence: number;
  whyText?: string;
  onStart: () => void;
  className?: string;
};

export function FounderTodayActionHero({
  goalId,
  confidence,
  onStart,
  className,
}: FounderTodayActionHeroProps) {
  const t = useTranslations('workflow.founderAiPm.todayHero');
  const td = useTranslations('workflow.aiPm.decision');
  const tp = useTranslations('workflow.plan.steps');

  const { actionTitle, minutes, impact, successScore, afterScore } = useMemo(() => {
    const pipeline = loadAgentPipelineResult();
    const stages = getDecisionStages(goalId);
    const stageIndex =
      confidence >= 81 ? 3 : confidence >= 68 ? 2 : confidence >= 50 ? 1 : 0;
    const currentStage = stages[stageIndex] ?? stages[0]!;
    const founderBrief = computeFounderAiPmBrief(currentStage, stageIndex);

    const pipelineAction = pipeline?.founderOs?.todayActions?.[0];
    const stepTitle = tp(`${currentStage.nextActionStepId}.title`);
    const action = pipelineAction?.title ?? pipeline?.decision?.nextAction?.title ?? stepTitle;
    const score =
      pipeline?.founderOs?.successScore?.percent ?? pipeline?.decision?.confidence ?? confidence;
    const eta = pipelineAction?.etaMinutes ?? currentStage.nextActionDurationMinutes;
    const gain = pipelineAction?.goImpact ?? founderBrief.nextAction.goProbabilityGain;

    return {
      actionTitle: action,
      successScore: score,
      afterScore: Math.min(100, score + gain),
      minutes: eta,
      impact: gain,
    };
  }, [confidence, goalId, tp]);

  return (
    <section
      className={cn(
        'rounded-3xl border-2 border-primary/40 bg-gradient-to-br from-primary/[0.14] via-primary/[0.06] to-background p-6 shadow-lg sm:p-8',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sparkles className="size-4" aria-hidden />
        {t('eyebrow')}
      </p>

      <div className="mt-4 space-y-1">
        <p className="text-lg font-medium text-muted-foreground sm:text-xl">{t('investmentLead')}</p>
        <p className="text-4xl font-bold tracking-tight tabular-nums sm:text-5xl">
          {t('minutes', { count: minutes })}
        </p>
        <p className="text-lg font-medium text-muted-foreground sm:text-xl">{t('investmentMid')}</p>
        <p className="flex flex-wrap items-baseline gap-2 text-3xl font-bold tabular-nums sm:text-4xl">
          <span>{successScore}%</span>
          <ArrowRight className="size-6 text-muted-foreground" aria-hidden />
          <span className="text-emerald-600 dark:text-emerald-400">{afterScore}%</span>
        </p>
        <p className="text-base text-muted-foreground sm:text-lg">{t('investmentTail')}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-border/60 bg-background/90 p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {td('recommendLabel')}
        </p>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed sm:text-base">
          {td('recommendAction', { action: actionTitle, minutes, impact })}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/90 px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {t('eta')}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">{t('minutes', { count: minutes })}</dd>
        </div>
        <div className="rounded-xl border border-emerald-300/50 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            {t('successScoreEffect')}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            +{impact}%
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        size="lg"
        className="mt-8 h-14 w-full rounded-2xl text-base font-semibold sm:max-w-md"
        onClick={onStart}
      >
        {t('startCta')}
      </Button>
    </section>
  );
}
