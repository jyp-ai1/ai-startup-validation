'use client';

import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';

import { cn } from '@repo/ui/lib/utils';

import type { EvidenceTrend } from '../../lib/v2-topic-judgment';

const ICON = {
  up: ArrowUp,
  down: ArrowDown,
  flat: ArrowRight,
} as const;

const COLOR = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-rose-600 dark:text-rose-400',
  flat: 'text-muted-foreground',
} as const;

export function TrendIndicator({
  trend,
  starDelta,
  className,
}: {
  trend: EvidenceTrend;
  starDelta?: number;
  className?: string;
}) {
  const Icon = ICON[trend];

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', COLOR[trend], className)}>
      <Icon className="size-3.5" aria-hidden />
      {starDelta != null && starDelta !== 0 ? (
        <span>({starDelta > 0 ? '+' : ''}{starDelta})</span>
      ) : null}
    </span>
  );
}
