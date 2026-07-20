'use client';

import { useTranslations } from 'next-intl';

import type { VOC } from '@repo/types/validation';
import { cn } from '@repo/ui/lib/utils';

type VocPainDashboardProps = {
  entries: VOC[];
  className?: string;
};

const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-emerald-500',
};

export function VocPainDashboard({ entries, className }: VocPainDashboardProps) {
  const t = useTranslations();

  const severityCounts = SEVERITY_ORDER.map((level) => ({
    level,
    count: entries.filter((e) => e.severity === level).length,
  }));
  const maxCount = Math.max(1, ...severityCounts.map((s) => s.count));
  const highPain = entries.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
  const paymentIntent = entries.filter(
    (e) => e.willingnessToPay === 'HIGH' || e.willingnessToPay === 'MEDIUM',
  ).length;
  const paymentPct = entries.length > 0 ? Math.round((paymentIntent / entries.length) * 100) : 0;

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile label={t('voc.painDashboard.interviews')} value={String(entries.length)} />
        <MetricTile label={t('voc.painDashboard.highPain')} value={String(highPain)} />
        <MetricTile label={t('voc.painDashboard.paymentIntent')} value={`${paymentPct}%`} />
      </div>

      <div className="ll-consulting-card">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t('voc.painDashboard.severityChart')}
        </p>
        <div className="mt-6 space-y-4">
          {severityCounts.map(({ level, count }) => (
            <div key={level}>
              <div className="mb-2 flex items-center justify-between text-[13px]">
                <span className="font-medium">{level}</span>
                <span className="tabular-nums text-muted-foreground">{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', SEVERITY_COLORS[level])}
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="ll-consulting-card px-6 py-6">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="mt-2 text-4xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
