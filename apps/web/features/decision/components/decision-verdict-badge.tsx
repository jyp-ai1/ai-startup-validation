'use client';

import { useTranslations } from 'next-intl';

import type { DecisionVerdict } from '@/features/decision';
import { cn } from '@repo/ui/lib/utils';

const VARIANTS: Record<
  DecisionVerdict,
  { labelKey: 'decision.verdict.go' | 'decision.verdict.hold' | 'decision.verdict.noGo'; className: string }
> = {
  GO: {
    labelKey: 'decision.verdict.go',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  HOLD: {
    labelKey: 'decision.verdict.hold',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  NO_GO: {
    labelKey: 'decision.verdict.noGo',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
};

type DecisionVerdictBadgeProps = {
  verdict: DecisionVerdict;
  className?: string;
  size?: 'default' | 'lg';
};

export function DecisionVerdictBadge({
  verdict,
  className,
  size = 'default',
}: DecisionVerdictBadgeProps) {
  const t = useTranslations();
  const v = VARIANTS[verdict];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-bold tracking-wide',
        size === 'lg' ? 'px-6 py-2 text-lg' : 'px-4 py-1.5 text-sm',
        v.className,
        className,
      )}
    >
      {t(v.labelKey)}
    </span>
  );
}
