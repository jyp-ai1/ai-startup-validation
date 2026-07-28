'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@repo/ui/lib/utils';

import type { PmReportStats } from '../../lib/v2-investigation-types';

type V2PmReportProps = {
  stats: PmReportStats;
  className?: string;
};

export function V2PmReport({ stats, className }: V2PmReportProps) {
  const t = useTranslations('workflow.v2.strategyWorkspace.ia.thinkingUx.investigation.report');

  const items = [
    { key: 'duration', value: t('durationValue', { minutes: stats.durationMinutes }) },
    { key: 'dataPoints', value: t('dataPointsValue', { count: stats.dataPoints }) },
    { key: 'opinions', value: t('opinionsValue', { count: stats.opinions }) },
    { key: 'decisions', value: t('decisionsValue', { count: stats.decisions }) },
  ] as const;

  return (
    <div className={cn('rounded-xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-background p-5', className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">{t('title')}</p>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.key}>
            <dt className="text-xs text-muted-foreground">{t(`fields.${item.key}`)}</dt>
            <dd className="mt-0.5 text-sm font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
