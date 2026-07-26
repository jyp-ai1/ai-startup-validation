'use client';

import { ArrowRight, BookOpen, Calendar, PartyPopper, Sparkles, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@repo/ui';
import { cn } from '@repo/ui/lib/utils';

import type {
  LivingDailyJournal,
  LivingFounderPattern,
  LivingHistoryEntry,
  LivingMomentum,
  LivingMorningContext,
  LivingMilestoneCelebration,
  LivingStuckAlert,
  LivingWeeklyStory,
} from '../../lib/founder-living-project';
import { AiPmConversation } from '../ai-state/ai-pm-conversation';

import type { OvernightInvestigationSnapshot } from '../../lib/founder-background-ai';

export function FounderOvernightInvestigationPanel({
  snapshot,
  syncing,
  className,
}: {
  snapshot: OvernightInvestigationSnapshot | null;
  syncing?: boolean;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.dailyCeo.backgroundAi');

  if (syncing) {
    return (
      <section
        className={cn(
          'rounded-2xl border-2 border-indigo-300/40 bg-gradient-to-br from-indigo-500/[0.08] to-background p-5 sm:p-6',
          className,
        )}
        aria-label={t('label')}
      >
        <p className="text-sm text-muted-foreground">{t('syncing')}</p>
      </section>
    );
  }

  if (!snapshot) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-indigo-400/50 bg-gradient-to-br from-indigo-500/[0.12] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">
        {t('label')}
      </p>
      <AiPmConversation
        messages={[
          t('greeting'),
          t('overnightLead'),
          t('agentLead'),
          t('investigationSummary', { total: snapshot.investigationCount }),
          t('importantLead'),
          t('importantSummary', { count: snapshot.importantCount }),
        ]}
      />
      {snapshot.importantItems.length > 0 ? (
        <ul className="mt-4 space-y-2" role="list">
          {snapshot.importantItems.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm font-medium">
              <span className="text-indigo-600" aria-hidden>
                •
              </span>
              <span>
                {t(`importantItems.${item.messageKey}`, item.params ?? {})}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {snapshot.fromRealRun ? (
        <p className="mt-4 text-xs text-muted-foreground">{t('realRunBadge')}</p>
      ) : null}
    </section>
  );
}

function formatDate(
  t: ReturnType<typeof useTranslations<'workflow.founderAiPm.livingProject'>>,
  entry: { isToday?: boolean; month: number; day: number },
): string {
  if (entry.isToday) return t('history.today');
  return t('history.dateLine', { month: entry.month, day: entry.day });
}

export function FounderLivingMilestoneCelebrationPanel({
  celebration,
  className,
}: {
  celebration: LivingMilestoneCelebration;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (!celebration.show) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-emerald-300/50 bg-gradient-to-br from-emerald-500/[0.12] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('celebration.label')}
    >
      <p className="flex items-center gap-2 text-2xl font-bold">
        <PartyPopper className="size-6 text-emerald-600" aria-hidden />
        {t('celebration.emoji')}
      </p>
      <p className="mt-3 text-base font-semibold leading-relaxed">
        {t(`celebration.messages.${celebration.messageKey}`, celebration.params ?? {})}
      </p>
    </section>
  );
}

export function FounderLivingWeeklyStoryPanel({
  story,
  className,
}: {
  story: LivingWeeklyStory;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-violet-300/40 bg-gradient-to-br from-violet-500/[0.08] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('weeklyStory.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300">
        {t('weeklyStory.label')}
      </p>
      <div className="mt-4 space-y-2">
        {story.progressMessageKeys.map((key) => (
          <p key={key} className="text-sm leading-relaxed">
            {t(`weeklyStory.progress.${key}`)}
          </p>
        ))}
      </div>
      <div className="mt-5 rounded-xl border border-violet-200/40 bg-background/80 px-4 py-3">
        <p className="text-sm text-muted-foreground">{t('weeklyStory.nextWeekLead')}</p>
        <p className="mt-1 text-sm font-semibold">
          {t(`weeklyStory.nextWeek.${story.nextWeekMessageKey}`, story.nextWeekParams ?? {})}
        </p>
      </div>
    </section>
  );
}

export function FounderLivingStuckAlertPanel({
  alert,
  onStart,
  className,
}: {
  alert: LivingStuckAlert;
  onStart?: (actionId: string) => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (!alert.show) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border-2 border-rose-300/40 bg-gradient-to-br from-rose-500/[0.07] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('stuck.label')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-rose-700 dark:text-rose-300">
        {t('stuck.label')}
      </p>
      <p className="mt-3 text-base font-semibold">
        {t('stuck.daysLead', { days: alert.daysStuck })}
      </p>
      <p className="mt-2 text-sm leading-relaxed">
        {t(`stuck.areas.${alert.areaMessageKey}`)}
      </p>
      <div className="mt-5 rounded-xl border border-rose-200/40 bg-background/80 px-4 py-4">
        <p className="text-sm text-muted-foreground">{t('stuck.recommendLead')}</p>
        <p className="mt-2 text-sm font-medium">{t('stuck.todayLead')}</p>
        <p className="mt-1 text-base font-semibold">{alert.recommendedTitle}</p>
        {onStart && alert.recommendedActionId ? (
          <Button
            type="button"
            className="mt-4 w-full rounded-xl"
            onClick={() => onStart(alert.recommendedActionId!)}
          >
            {t('stuck.startCta')}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function FounderLivingMomentumPanel({
  momentum,
  className,
}: {
  momentum: LivingMomentum;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('momentum.label')}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        <TrendingUp className="size-3.5" aria-hidden />
        {t('momentum.label')}
      </p>
      <p className="mt-3 text-sm leading-relaxed">
        {t(`momentum.story.${momentum.storyMessageKey}`)}
      </p>
      <div className="mt-4 flex items-center gap-1" aria-hidden>
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            className={cn(
              'h-2 flex-1 rounded-sm',
              index < momentum.filledSegments ? 'bg-primary' : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">{momentum.percent}%</p>
    </section>
  );
}

export function FounderLivingDailyJournalPanel({
  journal,
  className,
}: {
  journal: LivingDailyJournal;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (!journal.show) return null;

  const messages = [
    t('journal.todayLead'),
    t(`journal.founder.${journal.founderMessageKey}`, journal.founderParams ?? {}),
    t(`journal.aiPm.${journal.aiPmMessageKey}`, journal.aiPmParams ?? {}),
    ...(journal.scoreMessageKey
      ? [t(`journal.score.${journal.scoreMessageKey}`, journal.scoreParams ?? {})]
      : []),
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border border-indigo-300/30 bg-gradient-to-br from-indigo-500/[0.05] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('journal.label')}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-indigo-700 dark:text-indigo-300">
        <BookOpen className="size-3.5" aria-hidden />
        {t('journal.label')}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('journal.dateLine', { month: journal.month, day: journal.day })}
      </p>
      <AiPmConversation messages={messages} className="mt-4" />
    </section>
  );
}

export function FounderLivingFounderPatternPanel({
  pattern,
  onStart,
  className,
}: {
  pattern: LivingFounderPattern;
  onStart?: () => void;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (!pattern.show) return null;

  return (
    <section
      className={cn(
        'rounded-2xl border border-violet-300/40 bg-gradient-to-br from-violet-500/[0.06] to-background p-5 sm:p-6',
        className,
      )}
      aria-label={t('pattern.label')}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-violet-700 dark:text-violet-300">
        <Sparkles className="size-3.5" aria-hidden />
        {t('pattern.label')}
      </p>
      <AiPmConversation messages={[t(`pattern.messages.${pattern.messageKey}`, pattern.params ?? {})]} />
      <div className="mt-4 rounded-xl border border-violet-200/50 bg-background/80 px-4 py-3">
        <p className="text-sm text-muted-foreground">{t('pattern.recommendLead')}</p>
        <p className="mt-1 text-sm font-semibold">{pattern.recommendedTitle}</p>
        {onStart ? (
          <Button type="button" variant="outline" className="mt-3 rounded-xl" onClick={onStart}>
            {t('pattern.startCta')}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

export function FounderLivingProjectHistoryPanel({
  entries,
  className,
}: {
  entries: LivingHistoryEntry[];
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (entries.length === 0) return null;

  return (
    <section
      className={cn('rounded-2xl border border-border/70 bg-card p-5 sm:p-6', className)}
      aria-label={t('history.label')}
    >
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-primary">
        <Calendar className="size-3.5" aria-hidden />
        {t('history.label')}
      </p>
      <ol className="mt-5 space-y-0" role="list">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
            {index < entries.length - 1 ? (
              <span
                className="absolute left-[7px] top-5 h-[calc(100%-8px)] w-px bg-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'mt-1.5 size-3.5 shrink-0 rounded-full border-2',
                entry.status === 'done'
                  ? 'border-emerald-600 bg-emerald-600'
                  : 'border-primary bg-primary animate-pulse',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-xs font-medium tabular-nums',
                  entry.status === 'current' ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {formatDate(t, entry)}
              </p>
              <p
                className={cn(
                  'mt-1 text-sm leading-relaxed',
                  entry.status === 'current' ? 'font-semibold' : '',
                )}
              >
                {t(`history.entries.${entry.messageKey}`, entry.params ?? {})}
              </p>
              {entry.subtitleKey ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(`history.entries.${entry.subtitleKey}`, entry.subtitleParams ?? {})}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FounderLivingMorningContextBlock({
  context,
  className,
}: {
  context: LivingMorningContext;
  className?: string;
}) {
  const t = useTranslations('workflow.founderAiPm.livingProject');

  if (!context.weeklyProgressKey && !context.stuckWarningKey) return null;

  const messages: string[] = [];
  if (context.weeklyProgressKey) {
    messages.push(
      t(`morningContext.${context.weeklyProgressKey}`, context.weeklyProgressParams ?? {}),
    );
  }
  if (context.stuckWarningKey) {
    messages.push(
      t(`morningContext.${context.stuckWarningKey}`, context.stuckWarningParams ?? {}),
    );
  }

  return (
    <div
      className={cn(
        'mt-5 rounded-xl border border-primary/20 bg-background/90 px-4 py-4',
        className,
      )}
    >
      <AiPmConversation messages={messages} />
    </div>
  );
}
