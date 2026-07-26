'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { resolveFounderActionTitle } from '../../lib/founder-action-display';
import type { FounderSuccessScore, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';

type FounderAiPmMorningConsoleProps = {
  score: FounderSuccessScore;
  primaryAction?: GeneratedTodayAction;
  taskCount: number;
  onApprove: () => void;
  className?: string;
};

export function FounderAiPmMorningConsole({
  score,
  primaryAction,
  taskCount,
  onApprove,
  className,
}: FounderAiPmMorningConsoleProps) {
  const t = useTranslations('workflow.founderAiPm.workConsole');
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');

  const minutes = primaryAction?.etaMinutes ?? 18;
  const afterScore = primaryAction
    ? Math.min(100, score.percent + primaryAction.goImpact)
    : Math.min(100, score.percent + 4);
  const actionTitle = resolveFounderActionTitle(
    primaryAction,
    (key, params) => td(key as 'vocInterview', params),
    t('defaultAction'),
  );

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-7',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('aiPmLabel')}
      </p>

      <div className="mt-4 space-y-2">
        <p className="text-lg font-semibold">{t('greeting')}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t('preparedLead', { count: taskCount })}
        </p>
      </div>

      <div className="my-6 border-t border-border/60" role="separator" />

      <div>
        <p className="text-sm font-semibold">{t('todayGoal')}</p>
        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-bold tabular-nums">{score.percent}%</p>
          <ArrowRight className="mb-2 size-5 text-muted-foreground" aria-hidden />
          <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {afterScore}%
          </p>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('eta', { minutes, action: actionTitle })}
        </p>
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-6 h-14 w-full rounded-xl text-base font-semibold"
        onClick={onApprove}
      >
        {t('approveCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}

type FounderAiPmWorkingNowProps = {
  className?: string;
};

export function FounderAiPmWorkingNow({ className }: FounderAiPmWorkingNowProps) {
  const t = useTranslations('workflow.founderAiPm.workConsole');
  const [progress, setProgress] = useState(70);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setProgress((value) => (value >= 95 ? 70 : value + 1));
    }, 3000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5', className)}
      aria-label={t('workingLabel')}
    >
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-semibold">{t('workingTitle')}</p>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t('workingTask')}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{progress}%</span>
        <span>{t('workingRemaining')}</span>
      </div>
    </section>
  );
}

type FounderAiPmPreparedTasksProps = {
  className?: string;
};

const PREPARED_TASK_KEYS = ['interview', 'competitor', 'pricing'] as const;

export function FounderAiPmPreparedTasks({ className }: FounderAiPmPreparedTasksProps) {
  const t = useTranslations('workflow.founderAiPm.workConsole');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('inboxLabel')}
    >
      <p className="text-base font-semibold">{t('inboxTitle')}</p>
      <ul className="mt-4 space-y-3" role="list">
        {PREPARED_TASK_KEYS.map((key) => (
          <li key={key} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden>
              ✓
            </span>
            <span className="leading-relaxed">{t(`preparedTasks.${key}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
