'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { CountUp } from './count-up';

type ReadinessRingProps = {
  label: string;
  percent: number;
  statusLabel: string;
  className?: string;
};

export function ReadinessRing({ label, percent, statusLabel, className }: ReadinessRingProps) {
  const radius = 54;
  const stroke = 6;
  const normalized = Math.min(100, Math.max(0, percent));
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <div
      className={cn(
        'll-consulting-card group flex flex-col items-center motion-safe:animate-in motion-safe:fade-in',
        className,
      )}
    >
      <div className="relative size-[140px]">
        <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/40"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={normalized} className="text-intelligence-number font-semibold tabular-nums tracking-tight" />
          <span className="text-[13px] text-muted-foreground">%</span>
        </div>
      </div>
      <p className="mt-6 text-center text-intelligence-card font-medium tracking-tight">{label}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{statusLabel}</p>
    </div>
  );
}

type ReadinessRingRowProps = {
  items: { label: string; percent: number; statusKey: string }[];
};

export function ReadinessRingRow({ items }: ReadinessRingRowProps) {
  const t = useTranslations();

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <ReadinessRing
          key={item.label}
          label={item.label}
          percent={item.percent}
          statusLabel={t(`intelligence.status.${item.statusKey}` as 'intelligence.status.excellent')}
        />
      ))}
    </div>
  );
}
