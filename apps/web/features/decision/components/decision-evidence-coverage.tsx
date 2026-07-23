'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { EvidenceCoverage } from '@/features/decision';
import { CountUp } from '@/components/intelligence/count-up';
import { cn } from '@repo/ui/lib/utils';

type DecisionEvidenceCoverageProps = {
  coverage: EvidenceCoverage;
  onMissingClick?: (id: string) => void;
};

export function DecisionEvidenceCoverage({
  coverage,
  onMissingClick,
}: DecisionEvidenceCoverageProps) {
  const t = useTranslations('decision.coverage');

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('desc')}</p>
        </div>
        <p className="text-3xl font-semibold tabular-nums">
          <CountUp value={coverage.overallPercent} />%
        </p>
      </div>

      <div className="h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${coverage.overallPercent}%` }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coverage.dimensions.map((dim) => (
          <Link
            key={dim.id}
            href={dim.href}
            onClick={() => {
              if (!dim.completed) onMissingClick?.(dim.id);
            }}
            className={cn(
              'rounded-lg border px-4 py-3 transition-colors hover:border-primary/40',
              dim.completed
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-border/50 bg-card',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t(dim.labelKey as 'research')}</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {dim.current}/{dim.required}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full',
                  dim.completed ? 'bg-emerald-500' : 'bg-primary/70',
                )}
                style={{ width: `${dim.percent}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
