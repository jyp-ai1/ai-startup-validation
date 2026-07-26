'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { BusinessProgressDimension } from '../../lib/founder-intelligence-engine';

const STAGES = [
  { key: 'marketValidation', progressKey: 'market', threshold: 60 },
  { key: 'customerValidation', progressKey: 'customer', threshold: 40 },
  { key: 'pricingValidation', progressKey: 'pricing', threshold: 50 },
  { key: 'mvp', progressKey: 'customer', threshold: 70 },
  { key: 'investmentPrep', progressKey: 'investment', threshold: 50 },
] as const;

export type JourneyStageStatus = 'done' | 'running' | 'upcoming';

export function resolveJourneyStageStatuses(
  businessProgress: BusinessProgressDimension[],
): JourneyStageStatus[] {
  let runningAssigned = false;

  return STAGES.map((stage) => {
    const percent =
      businessProgress.find((dim) => dim.key === stage.progressKey)?.percent ?? 0;

    if (percent >= stage.threshold) return 'done';
    if (!runningAssigned) {
      runningAssigned = true;
      return 'running';
    }
    return 'upcoming';
  });
}

type FounderJourneyMapProps = {
  businessProgress: BusinessProgressDimension[];
  className?: string;
};

const STATUS_ICON: Record<JourneyStageStatus, string> = {
  done: '✔',
  running: '●',
  upcoming: '○',
};

export function FounderJourneyMap({ businessProgress, className }: FounderJourneyMapProps) {
  const t = useTranslations('workflow.aiState.journeyMap');
  const statuses = resolveJourneyStageStatuses(businessProgress);

  return (
    <nav
      className={cn(
        'overflow-x-auto rounded-2xl border border-border/70 bg-muted/20 p-4',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        {t('label')}
      </p>
      <ol className="mt-3 space-y-2" role="list">
        {STAGES.map((stage, index) => {
          const status = statuses[index] ?? 'upcoming';
          const isRunning = status === 'running';
          const isDone = status === 'done';

          return (
            <li
              key={stage.key}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2 text-sm',
                isRunning && 'bg-primary/10 font-medium',
                isDone && 'text-emerald-700 dark:text-emerald-400',
                !isDone && !isRunning && 'text-muted-foreground',
              )}
            >
              <span aria-hidden className="w-4 shrink-0 text-center">
                {STATUS_ICON[status]}
              </span>
              <span>{t(`dynamicStages.${stage.key}.${status}`)}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
