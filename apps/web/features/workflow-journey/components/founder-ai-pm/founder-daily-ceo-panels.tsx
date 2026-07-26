'use client';

import { useState } from 'react';
import { ArrowRight, Check, Inbox, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { DailyCeoOperatingBrief, DailyChangeItem } from '../../lib/founder-daily-ceo-loop';
import type {
  AiPmMemoryBrief,
  ApprovalQueueItem,
  BusinessTimelineMilestone,
  DailyReportBrief,
} from '../../lib/founder-autonomous-ai-pm';
import type { DailyCeoHabitBrief, WhatChangedItem } from '../../lib/founder-daily-ceo-habit';
import type { LivingMorningContext } from '../../lib/founder-living-project';
import { buildSignatureMorningGreeting } from '../../lib/founder-morning-signature';
import { FounderLivingMorningContextBlock } from './founder-living-project-panels';
import type { TodayApprovalChoice } from '../../lib/founder-daily-ceo-store';
import type { AiPmInboxItem } from '../../lib/founder-ai-pm-inbox';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

function ChangeList({
  items,
  t,
  namespace = 'changes',
}: {
  items: DailyChangeItem[];
  t: ReturnType<typeof useTranslations<'workflow.founderAiPm.dailyCeo'>>;
  namespace?: 'changes' | 'overnightWork' | 'overnightReport' | 'dailyReport' | 'morningChanges';
}) {
  return (
    <ul className="mt-3 space-y-2" role="list">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{t(`${namespace}.${item.messageKey}`, item.params ?? {})}</span>
        </li>
      ))}
    </ul>
  );
}

export function FounderAiPmOfficeHeader({ className }: { className?: string }) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <header className={cn('space-y-2 border-b border-border/60 pb-5', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary">
        {t('office.label')}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('office.title')}</h1>
      <p className="text-sm text-muted-foreground">{t('office.subtitle')}</p>
    </header>
  );
}

export function FounderOvernightResearchPanel({
  items,
  viewed,
  onView,
  className,
}: {
  items: DailyChangeItem[];
  viewed: boolean;
  onView: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (viewed) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('overnight.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">
        {t('overnight.completedTitle')}
      </p>
      <ChangeList items={items} t={t} namespace="overnightWork" />
      <Button type="button" className="mt-5 w-full rounded-xl" onClick={onView}>
        {t('overnight.reportCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}

export function FounderOvernightBriefPanel({
  brief,
  viewed,
  onView,
  className,
}: {
  brief: DailyCeoOperatingBrief;
  viewed: boolean;
  onView: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (viewed) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('overnight.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">
        {t('overnight.label')}
      </p>
      <AiPmConversation
        messages={[
          brief.isReturningVisit ? t('overnight.returningLead') : t('overnight.firstLead'),
          t('overnight.changeCount', { count: brief.overnightChanges.length }),
        ]}
      />
      <ChangeList items={brief.overnightChanges.slice(0, 3)} t={t} />
      <Button type="button" className="mt-5 w-full rounded-xl" onClick={onView}>
        {t('overnight.viewCta')}
        <ArrowRight className="ml-2 size-4" aria-hidden />
      </Button>
    </section>
  );
}

export function FounderCeoMorningBriefPanel({
  habit,
  livingContext,
  className,
}: {
  habit: DailyCeoHabitBrief;
  livingContext?: LivingMorningContext;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('morning.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sun className="size-3.5" aria-hidden />
        {t('morning.label')}
      </p>
      <AiPmConversation messages={buildSignatureMorningGreeting(t).split('\n\n')} />
      {livingContext ? (
        <FounderLivingMorningContextBlock context={livingContext} />
      ) : null}
      <ChangeList items={habit.morningChanges} t={t} namespace="morningChanges" />
      <div className="mt-5 rounded-xl border border-primary/25 bg-background/90 px-4 py-4">
        <p className="text-sm text-muted-foreground">{t('morning.todayLead')}</p>
        <p className="mt-2 text-base font-semibold">
          {t(`habit.focusHints.${habit.todayFocusHintKey}`, habit.todayFocusHintParams ?? {})}
        </p>
      </div>
    </section>
  );
}

export function FounderWhatChangedPanel({
  items,
  className,
}: {
  items: WhatChangedItem[];
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (items.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-amber-300/40 bg-amber-500/[0.05] p-5 sm:p-6', className)}
      aria-label={t('whatChanged.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-800 dark:text-amber-300">
        {t('whatChanged.label')}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t('whatChanged.lead')}</p>
      <ul className="mt-3 space-y-2" role="list">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2 text-sm">
            <span
              className={cn(
                'mt-0.5 font-bold tabular-nums',
                item.tone === 'positive' ? 'text-emerald-600' : 'text-rose-600',
              )}
              aria-hidden
            >
              {item.tone === 'positive' ? '+' : '−'}
            </span>
            <span>{t(`whatChanged.items.${item.messageKey}`, item.params ?? {})}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm font-medium">{t('whatChanged.confirmLead')}</p>
    </section>
  );
}

export function FounderAiPmOvernightReportPanel({
  items,
  onViewReport,
  className,
}: {
  items: DailyChangeItem[];
  onViewReport?: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('overnightReport.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">
        {t('overnightReport.title')}
      </p>
      <ChangeList items={items} t={t} namespace="overnightReport" />
      {onViewReport ? (
        <Button type="button" variant="outline" className="mt-5 w-full rounded-xl" onClick={onViewReport}>
          {t('overnightReport.viewCta')}
          <ArrowRight className="ml-2 size-4" aria-hidden />
        </Button>
      ) : null}
    </section>
  );
}

export function FounderTodayFocusPanel({
  focus,
  approved,
  onApprove,
  className,
}: {
  focus: ApprovalQueueItem | null;
  approved: boolean;
  onApprove: (actionId: string) => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (!focus) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-emerald-300/40 bg-gradient-to-br from-emerald-500/[0.07] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('todayFocus.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800 dark:text-emerald-300">
        {t('todayFocus.label')}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">{t('todayFocus.oneThingLead')}</p>
      <p className="mt-2 text-xl font-semibold">{focus.title}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('approvalQueue.expectedEffect', { impact: focus.goImpact })}
      </p>
      {approved ? (
        <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          {t('approvalQueue.approvedBadge')}
        </p>
      ) : (
        <Button type="button" size="lg" className="mt-5 w-full rounded-xl" onClick={() => onApprove(focus.actionId)}>
          {t('approval.approve')}
        </Button>
      )}
    </section>
  );
}

export function FounderDailyCeoMorningPanel({
  brief,
  className,
}: {
  brief: DailyCeoOperatingBrief;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('morning.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <Sun className="size-3.5" aria-hidden />
        {t('morning.label')}
      </p>
      <AiPmConversation messages={buildSignatureMorningGreeting(t).split('\n\n')} />
      <div className="mt-5 rounded-xl border border-primary/25 bg-background/90 px-4 py-4">
        <p className="text-sm text-muted-foreground">{t('morning.todayLead')}</p>
        <p className="mt-2 text-base font-semibold">{brief.todayActionTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('morning.todayMeta', {
            minutes: brief.todayActionMinutes,
            before: brief.scoreBefore,
            after: brief.scoreAfter,
          })}
        </p>
      </div>
    </section>
  );
}

export function FounderCeoInboxPanel({
  items,
  pendingCount,
  onReview,
  className,
}: {
  items: AiPmInboxItem[];
  pendingCount: number;
  onReview?: (actionId?: string) => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');
  const ti = useTranslations('workflow.founderAiPm.inbox');

  if (items.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('inbox.label')}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold">
          <Inbox className="size-4 text-primary" aria-hidden />
          {t('inbox.title')}
        </p>
        <p className="text-sm font-medium text-primary">{t('inbox.pending', { count: pendingCount })}</p>
      </div>

      <ul className="mt-4 space-y-2" role="list">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm"
          >
            <span className="mt-0.5 text-muted-foreground" aria-hidden>
              [ ]
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{ti(`items.${item.headlineKey}`, item.headlineParams ?? {})}</p>
              <p className="mt-1 text-muted-foreground">
                {ti(`items.${item.suggestionKey}`, item.suggestionParams ?? {})}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {items[0]?.actionId && onReview ? (
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-full rounded-xl"
          onClick={() => onReview(items[0]?.actionId)}
        >
          {t('inbox.reviewCta')}
        </Button>
      ) : null}
    </section>
  );
}

const APPROVAL_ORDER_MARKS = ['①', '②', '③'] as const;

export function FounderCeoApprovalQueuePanel({
  items,
  approvedIds,
  onApprove,
  className,
}: {
  items: ApprovalQueueItem[];
  approvedIds: string[];
  onApprove: (actionId: string) => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (items.length === 0) return null;

  const pending = items.filter((item) => !approvedIds.includes(item.actionId));

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('approvalQueue.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('approvalQueue.label')}
      </p>
      <ul className="mt-4 space-y-0" role="list">
        {items.map((item, index) => {
          const approved = approvedIds.includes(item.actionId);
          return (
            <li key={item.id} className={index > 0 ? 'border-t border-border/60 pt-3 mt-3' : undefined}>
              <div
                className={cn(
                  'rounded-xl border px-4 py-4',
                  approved
                    ? 'border-emerald-300/40 bg-emerald-500/[0.06]'
                    : 'border-border/60 bg-muted/10',
                )}
              >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {APPROVAL_ORDER_MARKS[item.order - 1] ?? `${item.order}.`} {item.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('approvalQueue.expectedEffect', { impact: item.goImpact })}
                  </p>
                </div>
                {approved ? (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {t('approvalQueue.approvedBadge')}
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 rounded-lg"
                    onClick={() => onApprove(item.actionId)}
                  >
                    {t('approval.approve')}
                  </Button>
                )}
              </div>
              </div>
            </li>
          );
        })}
      </ul>
      {pending.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('approvalQueue.allApproved')}</p>
      ) : null}
    </section>
  );
}

export function FounderAiPmDailyReportPanel({
  report,
  className,
}: {
  report: DailyReportBrief;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (!report.showReport) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('dailyReport.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
        <Moon className="size-3.5" aria-hidden />
        {t('dailyReport.label')}
      </p>
      <p className="mt-3 text-sm font-medium">{t('dailyReport.completedLead')}</p>
      <ChangeList items={report.completedItems} t={t} namespace="dailyReport" />
      <div className="mt-5 rounded-xl border border-indigo-200/50 bg-background/80 px-4 py-4">
        <p className="text-sm text-muted-foreground">{t('dailyReport.scoreLead')}</p>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {report.scoreFrom}% → {report.scoreTo}%
        </p>
      </div>
      <p className="mt-4 text-sm font-medium">
        {t('dailyReport.tomorrow', { focus: report.tomorrowFocus })}
      </p>
    </section>
  );
}

export function FounderBusinessTimelinePanel({
  milestones,
  className,
}: {
  milestones: BusinessTimelineMilestone[];
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (milestones.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('businessTimeline.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        {t('businessTimeline.label')}
      </p>
      <ol className="mt-4 space-y-0" role="list">
        {milestones.map((milestone, index) => (
          <li key={milestone.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < milestones.length - 1 ? (
              <span
                className="absolute left-[7px] top-4 h-[calc(100%-4px)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'mt-1 size-3.5 shrink-0 rounded-full border-2',
                milestone.status === 'done'
                  ? 'border-emerald-600 bg-emerald-600'
                  : milestone.status === 'current'
                    ? 'border-primary bg-primary'
                    : 'border-border bg-background',
              )}
              aria-hidden
            />
            <div>
              <p
                className={cn(
                  'text-sm',
                  milestone.status === 'current' ? 'font-semibold text-primary' : 'text-muted-foreground',
                  milestone.status === 'done' && 'font-medium text-foreground',
                )}
              >
                {t(`businessTimeline.milestones.${milestone.labelKey}`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FounderAiPmMemoryBriefPanel({
  memory,
  onStart,
  className,
}: {
  memory: AiPmMemoryBrief;
  onStart?: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (!memory.show) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-500/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('memory.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300">
        {t('memory.label')}
      </p>
      <AiPmConversation
        messages={[t(`memory.${memory.messageKey}`, memory.params ?? {})]}
      />
      <div className="mt-4 rounded-xl border border-violet-200/50 bg-background/80 px-4 py-3">
        <p className="text-sm text-muted-foreground">{t('memory.recommendLead')}</p>
        <p className="mt-1 text-sm font-semibold">{memory.recommendedTitle}</p>
        {onStart ? (
          <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={onStart}>
            {t('memory.startCta')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function FounderTodayApprovalPanel({
  brief,
  approvalChoice,
  onApprove,
  onTomorrow,
  onHold,
  className,
}: {
  brief: DailyCeoOperatingBrief;
  approvalChoice: TodayApprovalChoice;
  onApprove: () => void;
  onTomorrow: () => void;
  onHold: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  if (approvalChoice === 'approved') {
    return (
      <section
        className={cn(
          'rounded-2xl border border-emerald-300/40 bg-emerald-500/[0.06] p-5 sm:p-6',
          className,
        )}
      >
        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{t('approval.approved')}</p>
        <p className="mt-2 text-sm text-muted-foreground">{brief.todayActionTitle}</p>
      </section>
    );
  }

  if (approvalChoice === 'tomorrow') {
    return (
      <section className={cn('rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6', className)}>
        <p className="text-sm font-medium">{t('approval.tomorrow')}</p>
      </section>
    );
  }

  if (approvalChoice === 'hold') {
    return (
      <section className={cn('rounded-2xl border border-border/70 bg-muted/20 p-5 sm:p-6', className)}>
        <p className="text-sm font-medium">{t('approval.hold')}</p>
      </section>
    );
  }

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('approval.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">{t('approval.label')}</p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{t('approval.question')}</p>
      <p className="mt-3 rounded-xl bg-muted/20 px-4 py-3 text-sm font-medium">{brief.todayActionTitle}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Button type="button" className="rounded-xl" onClick={onApprove}>
          {t('approval.approve')}
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onTomorrow}>
          {t('approval.tomorrowCta')}
        </Button>
        <Button type="button" variant="ghost" className="rounded-xl" onClick={onHold}>
          {t('approval.holdCta')}
        </Button>
      </div>
    </section>
  );
}

export function FounderDailyCeoEveningPanel({
  delta,
  tomorrowFocus,
  className,
}: {
  delta: number;
  tomorrowFocus: string;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <section
      className={cn(
        'rounded-2xl border border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('evening.label')}
    >
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
        <Moon className="size-3.5" aria-hidden />
        {t('evening.label')}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{t('evening.summary', { delta })}</p>
      <p className="mt-4 text-sm font-medium">{t('evening.tomorrow', { focus: tomorrowFocus })}</p>
    </section>
  );
}

export function FounderWeeklyCeoLoopPanel({
  scoreFrom,
  scoreTo,
  className,
}: {
  scoreFrom: number;
  scoreTo: number;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('weekly.label')}
    >
      <p className="text-sm font-semibold">{t('weekly.title')}</p>
      <p className="mt-3 text-3xl font-bold tabular-nums">
        {scoreFrom}% → {scoreTo}%
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t('weekly.subtitle')}</p>
    </section>
  );
}
