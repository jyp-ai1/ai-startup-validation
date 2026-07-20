'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Circle,
  FileText,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Swords,
} from 'lucide-react';

import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { ValidationScoreRadar } from '@/features/validation/components/validation-score-radar';
import { cn } from '@repo/ui/lib/utils';

type KpiMetricsRowProps = {
  stats: ProjectDashboardStats;
};

export function KpiMetricsRow({ stats }: KpiMetricsRowProps) {
  const t = useTranslations();
  const { project, validationScore, evidence, voc, competitors } = stats;

  const items = [
    {
      label: t('dashboard.kpi.score'),
      value: validationScore?.totalScore ?? '—',
      href: `/projects/${project.id}/validation`,
      icon: ShieldCheck,
    },
    {
      label: t('dashboard.kpi.evidence'),
      value: evidence.total,
      href: `/projects/${project.id}/evidence`,
      icon: FileText,
    },
    {
      label: t('dashboard.kpi.voc'),
      value: voc.total,
      href: `/projects/${project.id}/voc`,
      icon: MessageSquareQuote,
    },
    {
      label: t('dashboard.kpi.competitors'),
      value: competitors.total,
      href: `/projects/${project.id}/competitors`,
      icon: Swords,
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className="group rounded-xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-primary/25 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <Icon className="size-4 text-muted-foreground/70 transition-colors group-hover:text-primary" />
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{item.value}</p>
          </Link>
        );
      })}
    </section>
  );
}

type DashboardPanelsProps = {
  stats: ProjectDashboardStats;
};

export function DashboardPanels({ stats }: DashboardPanelsProps) {
  const t = useTranslations();
  const { project, research, evidence, competitors, recentActivity, nextActions } = stats;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        <Panel title={t('dashboard.researchProgress')}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">{research.progressPercent}%</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('dashboard.researchCompleted', {
                  completed: research.completed,
                  total: research.total,
                })}
              </p>
            </div>
            <Search className="size-5 text-muted-foreground" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${research.progressPercent}%` }}
            />
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title={t('dashboard.evidenceBreakdown')}>
            <p className="text-3xl font-semibold tabular-nums">{evidence.total}</p>
            <div className="mt-4 space-y-2">
              {[
                { key: 'HIGH', label: t('dashboard.confidence.high'), value: evidence.byConfidence.HIGH },
                { key: 'MEDIUM', label: t('dashboard.confidence.medium'), value: evidence.byConfidence.MEDIUM },
                { key: 'LOW', label: t('dashboard.confidence.low'), value: evidence.byConfidence.LOW },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-medium tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t('dashboard.competitorMatrix')}>
            <p className="text-3xl font-semibold tabular-nums">{competitors.total}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { key: 'LEADER', label: t('dashboard.positions.leader') },
                { key: 'CHALLENGER', label: t('dashboard.positions.challenger') },
                { key: 'FOLLOWER', label: t('dashboard.positions.follower') },
                { key: 'NEWCOMER', label: t('dashboard.positions.newcomer') },
              ].map((row) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {competitors.byPosition[row.key as keyof typeof competitors.byPosition]}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {stats.validationScore ? (
          <Panel title={t('dashboard.validationRadar')}>
            <ValidationScoreRadar score={stats.validationScore} />
          </Panel>
        ) : null}
      </div>

      <div className="space-y-6">
        <Panel title={t('dashboard.recentActivity')}>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('dashboard.noActivity')}</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0">
                    <p className="font-medium">{t(`dashboard.activity.${item.type}`)}</p>
                    <p className="truncate text-muted-foreground">{item.label}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t('dashboard.nextActions')}>
          <ul className="space-y-2">
            {nextActions.map((action) => (
              <li key={action.id}>
                <Link
                  href={action.href}
                  className={cn(
                    'flex items-start gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50',
                    action.completed && 'opacity-60',
                  )}
                >
                  {action.completed ? (
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span>{t(action.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title={t('dashboard.grants')}>
          <p className="text-3xl font-semibold tabular-nums">{stats.grants.total}</p>
          <Link
            href={`/projects/${project.id}/grants`}
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            {t('dashboard.viewGrants')}
          </Link>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/70 bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
