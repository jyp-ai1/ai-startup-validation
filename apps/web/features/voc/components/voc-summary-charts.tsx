'use client';

import { useTranslations } from 'next-intl';
import type { VOCDistributionItem } from '@repo/types/validation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type DistributionChartProps = {
  title: string;
  data: VOCDistributionItem[];
  emptyMessage: string;
};

function DistributionChart({ title, data, emptyMessage }: DistributionChartProps) {
  const hasData = data.some((item) => item.count > 0);

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 text-sm font-medium">{title}</h3>
      {hasData ? (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} width={32} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </div>
  );
}

type VOCSummaryChartsProps = {
  severityDistribution: VOCDistributionItem[];
  frequencyDistribution: VOCDistributionItem[];
  willingnessDistribution: VOCDistributionItem[];
  customerSegmentDistribution: VOCDistributionItem[];
};

export function VOCSummaryCharts({
  severityDistribution,
  frequencyDistribution,
  willingnessDistribution,
  customerSegmentDistribution,
}: VOCSummaryChartsProps) {
  const t = useTranslations('voc.charts');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DistributionChart
        title={t('severity')}
        data={severityDistribution}
        emptyMessage={t('noData')}
      />
      <DistributionChart
        title={t('frequency')}
        data={frequencyDistribution}
        emptyMessage={t('noData')}
      />
      <DistributionChart
        title={t('paymentIntent')}
        data={willingnessDistribution}
        emptyMessage={t('noData')}
      />
      <DistributionChart
        title={t('customerSegment')}
        data={customerSegmentDistribution}
        emptyMessage={t('noData')}
      />
    </div>
  );
}
