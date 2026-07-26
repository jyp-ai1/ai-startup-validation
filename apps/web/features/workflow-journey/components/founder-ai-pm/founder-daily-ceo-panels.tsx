'use client';

import { useState } from 'react';
import { ArrowRight, Check, Inbox, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type { DailyCeoOperatingBrief, DailyChangeItem } from '../../lib/founder-daily-ceo-loop';
import type { TodayApprovalChoice } from '../../lib/founder-daily-ceo-store';
import type { AiPmInboxItem } from '../../lib/founder-ai-pm-inbox';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

function ChangeList({
  items,
  t,
}: {
  items: DailyChangeItem[];
  t: ReturnType<typeof useTranslations<'workflow.founderAiPm.dailyCeo'>>;
}) {
  return (
    <ul className="mt-3 space-y-2" role="list">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{t(`changes.${item.messageKey}`, item.params ?? {})}</span>
        </li>
      ))}
    </ul>
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
      <AiPmConversation
        messages={[
          t('morning.greeting'),
          t('morning.changesLead'),
        ]}
      />
      <ChangeList items={brief.morningChanges} t={t} />
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
