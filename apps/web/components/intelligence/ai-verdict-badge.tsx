import { cn } from '@repo/ui/lib/utils';

import type { IntelligenceVerdict } from '@/lib/intelligence/types';

const VARIANTS: Record<
  IntelligenceVerdict,
  { label: string; className: string }
> = {
  GO: {
    label: 'GO',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  REVIEW: {
    label: 'REVIEW',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  },
  HOLD: {
    label: 'HOLD',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
  },
  INSUFFICIENT: {
    label: '—',
    className: 'border-border bg-muted text-muted-foreground',
  },
};

type AiVerdictBadgeProps = {
  verdict: IntelligenceVerdict;
  className?: string;
};

export function AiVerdictBadge({ verdict, className }: AiVerdictBadgeProps) {
  const v = VARIANTS[verdict];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide',
        v.className,
        className,
      )}
    >
      {v.label}
    </span>
  );
}
