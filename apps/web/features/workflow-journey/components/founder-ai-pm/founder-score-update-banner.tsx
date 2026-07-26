'use client';

import { TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

type FounderScoreUpdateBannerProps = {
  scoreDelta: number;
  scoreAfter: number;
  className?: string;
};

export function FounderScoreUpdateBanner({
  scoreDelta,
  scoreAfter,
  className,
}: FounderScoreUpdateBannerProps) {
  const t = useTranslations('workflow.founderAiPm.scoreUpdate');

  if (scoreDelta <= 0) return null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-emerald-300/40 bg-emerald-50/60 px-5 py-4 dark:bg-emerald-950/20',
        className,
      )}
      role="status"
    >
      <p className="whitespace-pre-line text-sm leading-relaxed">{t('lead')}</p>
      <p className="mt-3 flex items-center gap-2 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
        <TrendingUp className="size-5" aria-hidden />+{scoreDelta}%
        <span className="text-base font-medium text-muted-foreground">
          ({t('after', { score: scoreAfter })})
        </span>
      </p>
    </div>
  );
}
