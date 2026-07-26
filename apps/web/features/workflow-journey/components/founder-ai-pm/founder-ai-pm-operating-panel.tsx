'use client';

import { Brain, CalendarRange, Clock, MessageSquareQuote, Sparkles, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import { computeFounderOperatingBrief } from '../../lib/founder-ai-pm-engine';
import type { WorkflowGoalId } from '../../types';

type FounderAiPmOperatingPanelProps = {
  goalId: WorkflowGoalId;
  confidence: number;
  projectName?: string;
  className?: string;
  variant?: 'full' | 'morning';
  hideMorningAlert?: boolean;
  onStartToday?: () => void;
};

export function FounderAiPmOperatingPanel({
  goalId,
  confidence,
  projectName,
  className,
  variant = 'full',
  hideMorningAlert = false,
  onStartToday,
}: FounderAiPmOperatingPanelProps) {
  const t = useTranslations('workflow.founderAiPm.operating');
  const operating = useMemo(
    () => computeFounderOperatingBrief(goalId, confidence),
    [confidence, goalId],
  );
  const { daily, dailyLoop, morningAlertKey, weekly, memory, mentor, calendar } = operating;
  const isMorning = variant === 'morning';

  return (
    <section
      className={cn('space-y-6', className)}
      aria-label={t('label')}
    >
      {/* Daily Loop — Morning → Working → Evening → Weekly → Monthly */}
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <Clock className="size-3.5" aria-hidden />
          {t('dailyLoop.title')}
        </p>
        <ol className="mt-4 flex flex-wrap gap-2" role="list">
          {dailyLoop.map((item) => (
            <li
              key={item.phase}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium',
                item.status === 'current'
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : item.status === 'done'
                    ? 'border-emerald-300/50 bg-emerald-50/60 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-border/60 bg-muted/30 text-muted-foreground',
              )}
            >
              {t(`dailyLoop.phases.${item.phase}`)} · {t(`dailyLoop.focus.${item.focusKey}`)}
            </li>
          ))}
        </ol>
      </div>

      {/* Daily Brief — hidden when Business Delta Brief leads */}
      {!isMorning || !hideMorningAlert ? (
      <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/[0.1] via-primary/[0.04] to-background p-6 sm:p-8">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
          <Sparkles className="size-4" aria-hidden />
          {t('daily.label')}
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{t('daily.greeting')}</h2>
        {projectName ? (
          <p className="mt-1 text-sm text-muted-foreground">{projectName}</p>
        ) : null}
        {isMorning && !hideMorningAlert ? (
          <p className="mt-4 rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-50">
            {t(`morningAlerts.${morningAlertKey}`, {
              current: daily.confidenceCurrent,
              after: daily.confidenceAfter,
              gain: daily.goProbabilityGain,
              minutes: daily.etaMinutes,
            })}
          </p>
        ) : null}
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/90 sm:text-lg">
          {t('daily.body', {
            count: daily.actionCount,
            gain: daily.goProbabilityGain,
          })}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            {t('daily.eta', { minutes: daily.etaMinutes })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <TrendingUp className="size-3.5" aria-hidden />
            {t('daily.confidencePath', {
              current: daily.confidenceCurrent,
              after: daily.confidenceAfter,
            })}
          </span>
        </div>
        {onStartToday && !isMorning ? (
          <Button type="button" size="lg" className="mt-6 rounded-xl" onClick={onStartToday}>
            {t('daily.startCta')}
          </Button>
        ) : null}
      </div>
      ) : null}

      {isMorning ? null : (
        <>
      {/* Strategy Calendar */}
      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          <CalendarRange className="size-3.5" aria-hidden />
          {t('calendar.title')}
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" role="list">
          {calendar.map((item) => (
            <li
              key={item.horizon}
              className={cn(
                'rounded-xl border px-3 py-3',
                item.status === 'current'
                  ? 'border-primary/40 bg-primary/[0.06]'
                  : item.status === 'done'
                    ? 'border-emerald-300/40 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : 'border-border/60 bg-muted/20',
              )}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`calendar.horizons.${item.horizon}`)}
              </p>
              <p className="mt-1.5 text-sm font-medium">{t(`calendar.items.${item.labelKey}`)}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Weekly Strategy */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 lg:col-span-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t('weekly.title')}
          </p>
          <ul className="mt-4 space-y-3" role="list">
            {weekly.pillars.map((pillar) => (
              <li key={pillar.key}>
                <div className="flex items-center justify-between text-sm">
                  <span>{t(`weekly.pillars.${pillar.key}`)}</span>
                  <span className="font-semibold tabular-nums">{pillar.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pillar.progress}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-primary/[0.06] px-3 py-2 text-sm font-medium text-primary">
            {t('weekly.recommend')}: {t(`weekly.recommendations.${weekly.recommendationKey}`)}
          </p>
        </div>

        {/* AI Memory */}
        <div className="rounded-2xl border border-border/70 bg-card p-5">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Brain className="size-3.5" aria-hidden />
            {t('memory.title')}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-foreground/90">
            {t(`memory.insights.${memory.insightKey}`)}
          </p>
        </div>

        {/* AI Mentor */}
        <div className="rounded-2xl border border-amber-300/50 bg-amber-50/40 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800 dark:text-amber-300">
            <MessageSquareQuote className="size-3.5" aria-hidden />
            {t('mentor.title')}
          </p>
          <p className="mt-2 text-xs font-medium text-amber-900/80 dark:text-amber-200/80">
            {t(`mentor.context.${mentor.contextKey}`)}
          </p>
          <p className="mt-3 text-sm font-medium leading-relaxed text-amber-950 dark:text-amber-50">
            {t(`mentor.advice.${mentor.adviceKey}`)}
          </p>
        </div>
      </div>
        </>
      )}
    </section>
  );
}
