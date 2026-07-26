'use client';

import { Check, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { FounderSuccessScore } from '../../lib/founder-intelligence-engine';

type FounderSuccessScorePanelProps = {
  score: FounderSuccessScore;
  className?: string;
};

export function FounderSuccessScorePanel({ score, className }: FounderSuccessScorePanelProps) {
  const t = useTranslations('workflow.founderAiPm.intelligence.successScore');

  return (
    <section
      className={cn(
        'rounded-3xl border-2 border-emerald-400/40 bg-gradient-to-br from-emerald-500/[0.14] via-background to-background p-6 shadow-lg sm:p-8',
        className,
      )}
      aria-label={t('label')}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
        {t('label')}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <p className="text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">{score.percent}%</p>
        {score.delta > 0 ? (
          <p className="mb-2 flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <TrendingUp className="size-4" aria-hidden />
            {t('delta', { delta: score.delta })}
          </p>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t('subtitle')}</p>
      <ul className="mt-5 space-y-2" role="list">
        {score.reasons && score.reasons.length > 0
          ? score.reasons.map((reason) => (
              <li
                key={reason}
                className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
              >
                <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {reason}
              </li>
            ))
          : score.reasonKeys.map((key) => (
              <li
                key={key}
                className="flex items-center gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 text-sm dark:bg-emerald-950/30"
              >
                <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {t(`reasons.${key}`)}
              </li>
            ))}
      </ul>
    </section>
  );
}
