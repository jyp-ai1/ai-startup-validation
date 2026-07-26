'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { BusinessProgressDimension, GeneratedTodayAction } from '../../lib/founder-intelligence-engine';
import { resolveJourneyStageStatuses, STAGES } from './founder-journey-stages';

type FounderJourneyMapProps = {
  businessProgress: BusinessProgressDimension[];
  nextAction?: GeneratedTodayAction;
  className?: string;
};

export function FounderJourneyMap({
  businessProgress,
  nextAction,
  className,
}: FounderJourneyMapProps) {
  const t = useTranslations('workflow.aiState.journeyMap');
  const statuses = resolveJourneyStageStatuses(businessProgress);

  const currentIndex = statuses.findIndex((status) => status === 'running');
  const nextIndex = statuses.findIndex((status, index) => status === 'upcoming' && index > currentIndex);

  const currentStage = currentIndex >= 0 ? STAGES[currentIndex] : STAGES[0];
  const nextStage = nextIndex >= 0 ? STAGES[nextIndex] : STAGES[currentIndex + 1];

  if (!currentStage) return null;

  return (
    <nav
      className={cn('rounded-2xl border border-border/70 bg-muted/20 p-5', className)}
      aria-label={t('label')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('currentLabel')}
      </p>
      <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
        <span aria-hidden>●</span>
        {t(`dynamicStages.${currentStage.key}.running`)}
      </p>

      {nextStage ? (
        <>
          <div className="my-4 border-t border-border/60" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nextLabel')}
          </p>
          <p className="mt-2 text-base font-medium">
            {t(`dynamicStages.${nextStage.key}.upcoming`)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-muted-foreground">
            {t('nextMeta', {
              minutes: nextAction?.etaMinutes ?? 15,
            })}
          </p>
        </>
      ) : null}
    </nav>
  );
}
