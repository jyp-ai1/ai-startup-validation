'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { DailyCeoHabitBrief } from '../../lib/founder-daily-ceo-habit';
import type { LivingMorningContext } from '../../lib/founder-living-project';
import type { OvernightInvestigationSnapshot } from '../../lib/founder-background-ai';
import {
  FounderAiPmOvernightReportPanel,
  FounderCeoMorningBriefPanel,
  FounderTodayFocusPanel,
} from './founder-daily-ceo-panels';
import { FounderAiPmLiveWorkPanel } from './founder-ai-pm-live-work-panel';
import { FounderAiPmPreparedTasks } from './founder-ai-pm-work-console';
import { FounderOvernightInvestigationPanel } from './founder-living-project-panels';

type FounderExecutiveOperatingRailProps = {
  habit: DailyCeoHabitBrief;
  livingMorningContext?: LivingMorningContext;
  overnightSnapshot: OvernightInvestigationSnapshot | null;
  overnightSyncing: boolean;
  approvedActionIds: string[];
  liveWorkActionId: string | null;
  liveWorkTitle: string;
  onApprove: (actionId: string) => void;
  onLiveWorkComplete: () => void;
  onOvernightView?: () => void;
  scoreBefore?: number;
  scoreAfter?: number;
  lastActionTitle?: string;
  className?: string;
};

export function FounderExecutiveOperatingRail({
  habit,
  livingMorningContext,
  overnightSnapshot,
  overnightSyncing,
  approvedActionIds,
  liveWorkActionId,
  liveWorkTitle,
  onApprove,
  onLiveWorkComplete,
  onOvernightView,
  scoreBefore,
  scoreAfter,
  lastActionTitle,
  className,
}: FounderExecutiveOperatingRailProps) {
  const t = useTranslations('workflow.founderAiPm.executiveOperatingRail');

  return (
    <div className={cn('space-y-4', className)}>
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
          {t('label')}
        </p>
      </div>

      <section aria-label={t('today')}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('today')}
        </p>
        <FounderCeoMorningBriefPanel habit={habit} livingContext={livingMorningContext} />
      </section>

      <section aria-label={t('overnight')}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('overnight')}
        </p>
        <FounderOvernightInvestigationPanel snapshot={overnightSnapshot} syncing={overnightSyncing} />
        <FounderAiPmOvernightReportPanel
          items={habit.overnightReport}
          onViewReport={onOvernightView}
        />
      </section>

      <section aria-label={t('approval')}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('approval')}
        </p>
        <FounderTodayFocusPanel
          focus={habit.todayFocus}
          approved={
            habit.todayFocus ? approvedActionIds.includes(habit.todayFocus.actionId) : false
          }
          onApprove={onApprove}
        />
      </section>

      {(liveWorkActionId || approvedActionIds.length > 0) && (
        <section aria-label={t('inProgress')}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('inProgress')}
          </p>
          {liveWorkActionId ? (
            <FounderAiPmLiveWorkPanel
              key={liveWorkActionId}
              actionTitle={liveWorkTitle}
              onComplete={onLiveWorkComplete}
            />
          ) : (
            <FounderAiPmPreparedTasks />
          )}
        </section>
      )}

      {scoreBefore != null && scoreAfter != null && scoreAfter > scoreBefore ? (
        <section aria-label={t('results')}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('results')}
          </p>
          <div className="rounded-xl border border-emerald-300/40 bg-emerald-50/40 p-4 dark:bg-emerald-950/20">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {lastActionTitle ?? t('resultDefault')}
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">
              {scoreBefore}% → {scoreAfter}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('resultHint')}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
