'use client';

import type { ValidationScore } from '@repo/types/validation';
import { useTranslations } from 'next-intl';

import { SCORE_CATEGORIES } from '@/features/validation/utils/score-calculator';
import { cn } from '@repo/ui/lib/utils';

type RiskHeatmapProps = {
  score: ValidationScore;
  className?: string;
};

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

function getRiskLevel(ratio: number): RiskLevel {
  if (ratio >= 0.75) return 'low';
  if (ratio >= 0.5) return 'medium';
  if (ratio >= 0.3) return 'high';
  return 'critical';
}

const RISK_STYLES: Record<RiskLevel, string> = {
  low: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  medium: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  critical: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
};

export function RiskHeatmap({ score, className }: RiskHeatmapProps) {
  const t = useTranslations();

  const cells = SCORE_CATEGORIES.map((category) => {
    const value = score[category.key];
    const ratio = value / category.maxScore;
    const risk = getRiskLevel(ratio);
    return { ...category, value, ratio, risk };
  });

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={cn(
              'rounded-xl border border-border/40 px-4 py-5 transition-all hover:-translate-y-0.5',
              RISK_STYLES[cell.risk],
            )}
          >
            <p className="text-[13px] font-medium">{cell.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {cell.value}
              <span className="text-sm font-normal text-muted-foreground">/{cell.maxScore}</span>
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wider opacity-80">
              {t(`intelligence.risk.${cell.risk}`)}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        {(['low', 'medium', 'high', 'critical'] as RiskLevel[]).map((level) => (
          <span key={level} className="flex items-center gap-2">
            <span className={cn('size-2.5 rounded-full', RISK_STYLES[level].split(' ')[0])} />
            {t(`intelligence.risk.${level}`)}
          </span>
        ))}
      </div>
    </div>
  );
}
