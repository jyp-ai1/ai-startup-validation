'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { ConfidenceLevel } from '../../lib/v2-topic-judgment';

type V2AiConfidenceBadgeProps = {
  confidence: number;
  level: ConfidenceLevel;
  className?: string;
  showPercent?: boolean;
};

const LEVEL_STYLE: Record<ConfidenceLevel, string> = {
  high: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-700 dark:text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/[0.06] text-amber-700 dark:text-amber-300',
  low: 'border-rose-500/30 bg-rose-500/[0.06] text-rose-700 dark:text-rose-300',
};

export function V2AiConfidenceBadge({
  confidence,
  level,
  className,
  showPercent = true,
}: V2AiConfidenceBadgeProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.thinkingUx.confidence');

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        LEVEL_STYLE[level],
        className,
      )}
    >
      <span className="uppercase tracking-wide">{t('label')}</span>
      {showPercent ? (
        <span>{confidence}%</span>
      ) : (
        <span>{t(`levels.${level}`)}</span>
      )}
    </span>
  );
}
