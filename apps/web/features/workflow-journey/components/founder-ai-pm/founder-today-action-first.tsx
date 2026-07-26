'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderTodayActionFirstProps = {
  score: FounderSuccessScore;
  actions: GeneratedTodayAction[];
  totalMinutes: number;
  onStartAction: (actionId: string) => void;
  className?: string;
};

export function FounderTodayActionFirst({
  score,
  actions,
  totalMinutes,
  onStartAction,
  className,
}: FounderTodayActionFirstProps) {
  const t = useTranslations('workflow.founderAiPm.todayFirst');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const afterScore = Math.min(
    100,
    score.percent + actions.reduce((sum, action) => sum + action.goImpact, 0),
  );
  const displayActions = actions.slice(0, 3);
  const taskMarkers = ['①', '②', '③'] as const;

  return (
    <section className={cn('space-y-6', className)} aria-label={t('label')}>
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6">
        <p className="text-lg font-semibold">{t('greeting')}</p>
        <p className="mt-3 text-base text-muted-foreground">{t('investmentLead')}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
          {t('minutes', { count: totalMinutes || displayActions[0]?.etaMinutes || 18 })}
        </p>
        <p className="mt-2 text-base text-muted-foreground">{t('investmentMid')}</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-2 text-2xl font-bold tabular-nums sm:text-3xl">
          <span>{score.percent}%</span>
          <ArrowRight className="size-5 text-muted-foreground" aria-hidden />
          <span className="text-emerald-600 dark:text-emerald-400">{afterScore}%</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t('investmentTail')}</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold">{t('tasksTitle')}</h2>
        <ol className="mt-4 space-y-3" role="list">
          {displayActions.map((action, index) => {
            const title =
              action.title ??
              (action.titleKey === 'vocInterview'
                ? td('vocInterview', action.titleParams ?? {})
                : action.titleKey
                  ? td(action.titleKey as 'primaryStep', action.titleParams ?? {})
                  : t('fallbackAction'));

            return (
              <li
                key={action.id}
                className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {taskMarkers[index] ?? `${index + 1}.`}
                    </p>
                    <p className="mt-1 text-base font-medium leading-snug">{title}</p>
                    <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                      {t('taskMeta', { minutes: action.etaMinutes, impact: action.goImpact })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="h-11 shrink-0 rounded-xl px-6"
                    onClick={() => onStartAction(action.id)}
                  >
                    {t('startCta')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
