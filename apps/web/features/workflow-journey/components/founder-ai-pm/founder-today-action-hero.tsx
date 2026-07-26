'use client';

import { Clock, Sparkles, Target, TrendingUp } from 'lucide-react';
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
  const tp = useTranslations('workflow.plan.steps');
  const td = useTranslations('workflow.decisionExperience');

  const { actionTitle, brief, stage } = useMemo(() => {
    const pipeline = loadAgentPipelineResult();
    const stages = getDecisionStages(goalId);
    const stageIndex =
      confidence >= 81 ? 3 : confidence >= 68 ? 2 : confidence >= 50 ? 1 : 0;
    const currentStage = stages[stageIndex] ?? stages[0]!;
    const founderBrief = computeFounderAiPmBrief(currentStage, stageIndex);

    const pipelineAction = pipeline?.decision?.nextAction?.title;
    const stepTitle = tp(`${currentStage.nextActionStepId}.title`);

    return {
      actionTitle: pipelineAction ?? stepTitle,
      brief: founderBrief,
      stage: currentStage,
    };
  }, [confidence, goalId, tp]);

  const { nextAction } = brief;
  const afterConfidence = Math.min(100, confidence + nextAction.confidenceGain);

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
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">{actionTitle}</h2>
      <p className="mt-3 max-w-2xl text-base text-muted-foreground sm:text-lg">{t('subtitle')}</p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border/60 bg-background/90 px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {t('eta')}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums">
            {t('minutes', { count: stage.nextActionDurationMinutes })}
          </dd>
        </div>
        <div className="rounded-xl border border-emerald-300/50 bg-emerald-50/60 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" aria-hidden />
            {t('confidenceEffect')}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
            {confidence}% → {afterConfidence}%
          </dd>
        </div>
        <div className="rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="size-3.5" aria-hidden />
            {t('goEffect')}
          </dt>
          <dd className="mt-1 text-xl font-bold tabular-nums text-primary">
            +{nextAction.goProbabilityGain}%
          </dd>
        </div>
      </dl>

      <Button
        type="button"
        size="lg"
        className="mt-8 h-14 w-full rounded-2xl text-base font-semibold sm:max-w-md"
        onClick={onStart}
      >
        {td(`mockActions.${stage.mockActionKey}`)}
      </Button>
    </section>
  );
}
