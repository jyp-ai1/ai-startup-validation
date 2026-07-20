'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import { CountUp } from './count-up';

type ConfidenceMeterProps = {
  value: number;
  className?: string;
};

export function ConfidenceMeter({ value, className }: ConfidenceMeterProps) {
  const t = useTranslations();
  const clamped = Math.min(100, Math.max(0, value));
  const radius = 62;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const reliabilityKey =
    clamped >= 85
      ? 'intelligence.reliability.excellent'
      : clamped >= 70
        ? 'intelligence.reliability.reliable'
        : clamped >= 50
          ? 'intelligence.reliability.moderate'
          : 'intelligence.reliability.low';

  return (
    <div className={cn('ll-consulting-card flex flex-col items-center p-10', className)}>
      <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('intelligence.confidenceMeter')}
      </p>
      <div className="relative mt-6 size-[160px]">
        <svg className="size-full -rotate-90" viewBox="0 0 140 140" aria-hidden>
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted/30"
          />
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-consulting-accent transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={clamped} className="text-4xl font-semibold tabular-nums" />
          <span className="text-[13px] text-muted-foreground">%</span>
        </div>
      </div>
      <p className="mt-4 text-sm font-medium text-consulting-accent">
        {t(reliabilityKey)}
      </p>
    </div>
  );
}
