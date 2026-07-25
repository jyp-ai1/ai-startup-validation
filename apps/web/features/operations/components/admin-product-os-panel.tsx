'use client';

import { useTranslations } from 'next-intl';
import { Brain, Sparkles, Target, TrendingDown } from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminProductOsPanelProps = {
  brief: NonNullable<OpsDashboardStats['productOs']>;
};

export function AdminProductOsPanel({ brief }: AdminProductOsPanelProps) {
  const t = useTranslations('operations.productOs');

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-background">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-primary" aria-hidden />
            {t('title')}
          </CardTitle>
          <Badge variant="outline" className="font-mono text-[10px]">
            {t('deploy')}: {brief.deployVersion}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Target className="size-3.5" aria-hidden />
              {t('primaryKpi')}
            </p>
            <p className="mt-1 text-lg font-semibold">{brief.primaryKpiLabel}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
              {brief.currentValue}
              {brief.unit}
            </p>
          </div>
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              <TrendingDown className="size-3.5" aria-hidden />
              {t('biggestDrop')}
            </p>
            <p className="mt-1 font-medium text-amber-950 dark:text-amber-50">{brief.biggestDropStep}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-amber-900 dark:text-amber-200">
              −{brief.dropPercent}%
            </p>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('rootCause')}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{brief.rootCause}</dd>
          </div>
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('hypothesis')}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{brief.hypothesis}</dd>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2.5 sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              {t('experiment')}
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-foreground">{brief.experiment}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {t('measure')}: <code className="rounded bg-muted px-1 py-0.5">{brief.measureBy}</code>
          </span>
          <span>·</span>
          <span>
            {t('nextKpi')}: <strong className="text-foreground">{brief.nextKpiKey}</strong>
          </span>
        </div>

        <p className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed text-foreground">
          {brief.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}
