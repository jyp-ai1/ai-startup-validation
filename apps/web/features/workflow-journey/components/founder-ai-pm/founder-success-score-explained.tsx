'use client';

import { ArrowRight, Check, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import type { SuccessScoreFactor } from '../../lib/founder-personalization-engine';
import type { FounderSuccessScore } from '../../lib/founder-intelligence-engine';

type FounderSuccessScoreExplainedProps = {
  score: FounderSuccessScore;
  factors: SuccessScoreFactor[];
  primaryAction?: GeneratedTodayAction;
  className?: string;
};

export function FounderSuccessScoreExplained({
  score,
  factors,
  primaryAction,
  className,
}: FounderSuccessScoreExplainedProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.successScore');
  const ta = useTranslations('workflow.founderAiPm.actionWorkspace.scoreExplained');

  const strengths = factors.filter((factor) => factor.status === 'strong');
  const gaps = factors.filter((factor) => factor.status === 'gap');
  const projected = Math.min(
    100,
    score.percent + (primaryAction?.goImpact ?? 4),
  );

  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-300/40 bg-gradient-to-br from-emerald-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-sm font-medium text-muted-foreground">{t('label')}</p>
      <p className="mt-2 text-4xl font-bold tabular-nums sm:text-5xl">{score.percent}%</p>
      <p className="mt-2 text-sm font-medium">{t('whyTitle', { percent: score.percent })}</p>

      <div className="mt-4 space-y-2">
        {strengths.map((factor) => (
          <div
            key={factor.key}
            className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
          >
            <Check className="size-4 shrink-0 text-emerald-600" aria-hidden />
            <span>{t(`factors.${factor.key}`)}</span>
          </div>
        ))}
        {gaps.map((factor) => (
          <div
            key={factor.key}
            className="flex items-center gap-2 rounded-lg bg-amber-50/80 px-3 py-2 text-sm dark:bg-amber-950/30"
          >
            <span className="font-medium text-amber-700 dark:text-amber-400" aria-hidden>
              △
            </span>
            <span>{t(`factors.${factor.key}`)}</span>
          </div>
        ))}
      </div>

      {primaryAction ? (
        <div className="mt-5 rounded-xl border border-primary/20 bg-primary/[0.04] px-4 py-3">
          <p className="text-sm text-muted-foreground">{ta('todayLead')}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-lg font-bold tabular-nums">
            <span>{primaryAction.title ?? ta('defaultAction')}</span>
            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-emerald-600 dark:text-emerald-400">{projected}%</span>
          </div>
          <p className="mt-1 flex items-center gap-1 text-sm text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="size-3.5" aria-hidden />+{primaryAction.goImpact}%
          </p>
        </div>
      ) : null}
    </section>
  );
}
