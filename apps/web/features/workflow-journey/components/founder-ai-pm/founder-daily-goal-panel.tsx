'use client';

import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderDailyGoalPanelProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  className?: string;
};

export function FounderDailyGoalPanel({
  score,
  primaryAction,
  className,
}: FounderDailyGoalPanelProps) {
  const t = useTranslations('workflow.founderAiPm.dailyGoal');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  if (!primaryAction) return null;

  const afterScore = Math.min(100, score.percent + primaryAction.goImpact);
  const actionTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('defaultAction'),
  );

  return (
    <section
      className={cn(
        'rounded-2xl border border-emerald-300/40 bg-emerald-50/40 p-5 dark:bg-emerald-950/15',
        className,
      )}
      aria-label={t('label')}
    >
      <div className="flex items-center gap-2">
        <Target className="size-4 text-emerald-600" aria-hidden />
        <p className="text-sm font-semibold">{t('title')}</p>
      </div>
      <p className="mt-3 text-lg font-semibold leading-snug">{actionTitle}</p>
      <div className="mt-4 border-t border-emerald-300/30 pt-4">
        <p className="text-sm text-muted-foreground">{t('completeLead')}</p>
        <p className="mt-1 text-sm font-medium">{t('scoreLead')}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
          {afterScore}%
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t('completeHint')}</p>
      </div>
    </section>
  );
}
