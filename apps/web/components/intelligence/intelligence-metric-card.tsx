'use client';

import { cn } from '@repo/ui/lib/utils';
import { formatRelativeTime } from '@repo/utils/date';

type IntelligenceMetricCardProps = {
  title: string;
  percent: number;
  statusLabel: string;
  updatedAt?: string;
  className?: string;
};

export function IntelligenceMetricCard({
  title,
  percent,
  statusLabel,
  updatedAt,
  className,
}: IntelligenceMetricCardProps) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/50 bg-card p-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
        className,
      )}
    >
      <p className="text-intelligence-card font-medium tracking-tight">{title}</p>
      <p className="mt-4 text-intelligence-number font-semibold tabular-nums tracking-tight">
        {clamped}
        <span className="text-2xl text-muted-foreground">%</span>
      </p>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 text-[13px]">
        <span className="font-medium text-success">{statusLabel}</span>
        {updatedAt ? (
          <span className="text-muted-foreground">
            {formatRelativeTime(new Date(updatedAt))}
          </span>
        ) : null}
      </div>
    </div>
  );
}
