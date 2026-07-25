'use client';

import { useTranslations } from 'next-intl';
import {
  Brain,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';

import type { OpsDashboardStats } from '@/lib/analytics/types';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@repo/ui';

type AdminProductOsPanelProps = {
  brief: NonNullable<OpsDashboardStats['productOs']>;
  brain?: OpsDashboardStats['productBrain'];
};

export function AdminProductOsPanel({ brief, brain }: AdminProductOsPanelProps) {
  const t = useTranslations('operations.productOs');

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/[0.04] to-background">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="size-4 text-primary" aria-hidden />
            {t('titleV2')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {brain ? (
              <Badge variant="secondary">
                {t('healthScore')}: {brain.healthScore}
              </Badge>
            ) : null}
            <Badge variant="outline" className="font-mono text-[10px]">
              {t('deploy')}: {brief.deployVersion}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{t('subtitleV2')}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* AI PM — 오늘 무엇을 개선해야 하는가 */}
        <div className="rounded-xl border border-primary/25 bg-primary/[0.05] p-4">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-primary">
            <Zap className="size-3.5" aria-hidden />
            {t('aiPmTitle')}
            <Badge className="ml-auto text-[10px]">{brief.aiPm.priority}</Badge>
          </p>
          <p className="mt-2 text-base font-semibold text-foreground">{brief.aiPm.todayProblem}</p>
          <p className="mt-1 text-sm text-muted-foreground">{brief.aiPm.whyImportant}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">{t('recommended')}</dt>
              <dd className="font-medium">{brief.aiPm.recommendedExperiment}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('expectedLift')}</dt>
              <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                {brief.aiPm.expectedLift}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('estimatedHours')}</dt>
              <dd>{brief.aiPm.estimatedHours}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('risk')}</dt>
              <dd className="capitalize">{brief.aiPm.risk}</dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/80 p-4 lg:col-span-1">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Target className="size-3.5" aria-hidden />
              {t('primaryKpi')}
            </p>
            <p className="mt-1 font-semibold">{brief.primaryKpiLabel}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">{brief.currentValue}{brief.unit}</p>
          </div>
          <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
              <TrendingDown className="size-3.5" aria-hidden />
              {t('biggestDrop')}
            </p>
            <p className="mt-1 font-medium">{brief.biggestDropStep}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">−{brief.dropPercent}%</p>
          </div>
          {brief.impact ? (
            <div
              className={`rounded-xl border p-4 ${
                brief.impact.rollback
                  ? 'border-red-300/60 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                  : brief.impact.adopt
                    ? 'border-emerald-300/60 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : 'border-border/60 bg-muted/20'
              }`}
            >
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <TrendingUp className="size-3.5" aria-hidden />
                {t('impact')}
              </p>
              <p className="mt-1 text-sm font-medium">{brief.impact.experimentName}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {brief.impact.baselineValue}% → {brief.impact.currentValue}%
                <span
                  className={
                    brief.impact.delta >= 0
                      ? 'ml-2 text-emerald-700 dark:text-emerald-400'
                      : 'ml-2 text-red-700 dark:text-red-400'
                  }
                >
                  ({brief.impact.deltaLabel})
                </span>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {brief.impact.adopt ? (
                  <Badge className="gap-1 bg-emerald-600">
                    <CheckCircle2 className="size-3" aria-hidden />
                    {t('adopt')}
                  </Badge>
                ) : null}
                {brief.impact.rollback ? (
                  <Badge variant="destructive" className="gap-1">
                    <RotateCcw className="size-3" aria-hidden />
                    {t('rollback')}
                  </Badge>
                ) : null}
                {!brief.impact.adopt && !brief.impact.rollback ? (
                  <Badge variant="secondary">{t('measuring')}</Badge>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('rootCause')}
            </dt>
            <dd className="mt-1 text-sm">{brief.rootCause}</dd>
          </div>
          <div className="rounded-lg bg-muted/30 px-3 py-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('hypothesis')}
            </dt>
            <dd className="mt-1 text-sm">{brief.hypothesis}</dd>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/[0.03] px-3 py-2.5 sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              {t('experiment')}
            </dt>
            <dd className="mt-1 text-sm">{brief.experiment}</dd>
          </div>
        </dl>

        <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('nextExperiment')}
          </p>
          <p className="mt-1 text-sm font-medium">{brief.nextExperiment}</p>
        </div>

        <p className="rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm leading-relaxed">
          {brief.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}
