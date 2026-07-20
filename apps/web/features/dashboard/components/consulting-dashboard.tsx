'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { WorkspaceContext } from '@/features/dashboard/types';
import { Button, EmptyState } from '@repo/ui';

import { DashboardPanels, KpiMetricsRow } from './dashboard-panels';
import { DashboardTimeline } from './dashboard-timeline';
import { ValidationScoreHero } from './validation-score-hero';

type ConsultingDashboardProps = {
  workspace: WorkspaceContext;
};

export function ConsultingDashboard({ workspace }: ConsultingDashboardProps) {
  const t = useTranslations();
  const { stats, projectCount } = workspace;

  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-10 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.welcome')}</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {t('dashboard.emptyWorkspaceDesc')}
          </p>
          <Button className="mt-6" asChild>
            <Link href="/projects/new">
              <Plus className="size-4" />
              {t('dashboard.newProject')}
            </Link>
          </Button>
        </div>
        <EmptyState
          title={t('dashboard.emptyTitle')}
          description={t('dashboard.emptyDescription')}
          action={
            <Button asChild>
              <Link href="/projects/new">{t('dashboard.newProject')}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {t('dashboard.todayStatus')}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('dashboard.pageTitle')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-background px-3 py-1 text-sm text-muted-foreground">
            {t('dashboard.projectCount', { count: projectCount })}
          </span>
          <Button variant="outline" asChild>
            <Link href="/projects">{t('nav.projects')}</Link>
          </Button>
        </div>
      </div>

      <ValidationScoreHero stats={stats} />
      <KpiMetricsRow stats={stats} />
      <DashboardTimeline stats={stats} />
      <DashboardPanels stats={stats} />
    </div>
  );
}
