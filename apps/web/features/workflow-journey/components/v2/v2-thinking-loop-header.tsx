'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ReviewFreshness } from '../../lib/v2-review-dirty-state';

type LoopPhase = 'thinking' | 'evidence' | 'decision' | 'memory';

const PHASES: LoopPhase[] = ['thinking', 'evidence', 'decision', 'memory'];

type V2ThinkingLoopHeaderProps = {
  activePhase: LoopPhase;
  reviewFreshness: ReviewFreshness;
  className?: string;
};

export function V2ThinkingLoopHeader({
  activePhase,
  reviewFreshness,
  className,
}: V2ThinkingLoopHeaderProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.thinkingLoop');

  return (
    <div className={cn('space-y-3', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-xs sm:gap-2">
        {PHASES.map((phase, index) => {
          const active = phase === activePhase;
          return (
            <li key={phase} className="flex items-center gap-1 sm:gap-2">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 font-medium transition-colors',
                  active
                    ? 'bg-primary/10 text-primary motion-safe:animate-pulse'
                    : 'text-muted-foreground',
                )}
              >
                {t(`phases.${phase}`)}
              </span>
              {index < PHASES.length - 1 ? (
                <span className="text-muted-foreground/50" aria-hidden>
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
      {reviewFreshness !== 'none' ? (
        <p
          className={cn(
            'text-xs font-medium',
            reviewFreshness === 'stale' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
          )}
        >
          {reviewFreshness === 'stale' ? t('reviewStale') : t('reviewCurrent')}
        </p>
      ) : null}
    </div>
  );
}

export type { LoopPhase };
