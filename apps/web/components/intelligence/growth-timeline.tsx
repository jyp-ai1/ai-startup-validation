'use client';

import { useTranslations } from 'next-intl';

import type { IntelligenceTimelinePoint } from '@/lib/intelligence/types';
import { cn } from '@repo/ui/lib/utils';

type GrowthTimelineProps = {
  points: IntelligenceTimelinePoint[];
  className?: string;
};

export function GrowthTimeline({ points, className }: GrowthTimelineProps) {
  const t = useTranslations();
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <div className={cn('ll-consulting-card p-10', className)}>
      <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t('intelligence.growthTimeline')}
      </p>
      <div className="mt-8 flex items-end justify-between gap-3">
        {points.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end justify-center">
              <div
                className="w-full max-w-[48px] rounded-t-lg bg-consulting-accent/80 transition-all duration-1000 ease-out"
                style={{ height: `${Math.max(8, (point.value / max) * 100)}%` }}
              />
            </div>
            <span className="text-[13px] text-muted-foreground">{point.label}</span>
            <span className="text-xs tabular-nums text-muted-foreground/70">{point.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
