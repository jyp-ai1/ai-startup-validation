'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { resolveStageIndex } from '../../lib/founder-ai-pm-engine';

const STAGES = [
  'idea',
  'marketValidation',
  'customerValidation',
  'strategyLock',
  'execution',
  'growth',
] as const;

type FounderJourneyMapProps = {
  confidence: number;
  verdict?: string;
  className?: string;
};

export function FounderJourneyMap({ confidence, verdict, className }: FounderJourneyMapProps) {
  const t = useTranslations('workflow.aiState.journeyMap');
  const stageIndex = resolveStageIndex(confidence);
  const activeIndex =
    verdict === 'GO' ? Math.max(stageIndex, 3) : Math.min(stageIndex + 1, STAGES.length - 1);

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
      <ol className="mt-3 flex min-w-max items-center gap-1 sm:gap-2" role="list">
        {STAGES.map((stage, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <li key={stage} className="flex items-center gap-1 sm:gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm',
                  isActive && 'bg-primary text-primary-foreground',
                  isDone && !isActive && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                  !isDone && !isActive && 'bg-muted text-muted-foreground',
                )}
              >
                {t(`stages.${stage}`)}
              </span>
              {index < STAGES.length - 1 ? (
                <span className="text-muted-foreground" aria-hidden>
                  ↓
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
