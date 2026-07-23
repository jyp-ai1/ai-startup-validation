'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  ActionCenter,
  AiSummaryCard,
  ExpertConsensus,
  GrowthTimeline,
  IntelligenceHero,
  IntelligenceSection,
  KeyInsights,
  AiReasoning,
  ReadinessRingRow,
  RiskHeatmap,
  ScoreBreakdown,
} from '@/components/intelligence';
import type { DecisionResult } from '@/features/decision';
import { DecisionSummaryPanel } from '@/features/decision/components/decision-summary-panel';
import { MarketSnapshotPanel } from '@/features/market-intelligence/components/market-snapshot-panel';
import type { WorkspaceContext } from '@/features/dashboard/types';
import { buildReadinessMetrics } from '@/features/dashboard/utils/readiness-calculator';
import { buildDashboardInsights } from '@/lib/intelligence/build-dashboard-insights';
import { ValidationScoreRadar } from '@/features/validation/components/validation-score-radar';
import { Button } from '@repo/ui';
import { formatRelativeTime } from '@repo/utils/date';

type IntelligenceDashboardProps = {
  workspace: WorkspaceContext;
  decision?: DecisionResult | null;
  activeProjectId?: string | null;
  activeProjectTitle?: string | null;
};

export function IntelligenceDashboard({
  workspace,
  decision,
  activeProjectId,
  activeProjectTitle,
}: IntelligenceDashboardProps) {
  const t = useTranslations();
  const { stats, projectCount } = workspace;

  if (!stats) {
    return (
      <div className="mx-auto max-w-3xl py-24 text-center">
        <p className="text-[13px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t('meta.appName')}
        </p>
        <h1 className="mt-4 text-intelligence-hero font-semibold tracking-tight">
          {t('intelligence.platformTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-lg text-muted-foreground">
          {t('intelligence.platformSubtitle')}
        </p>
        <p className="mx-auto mt-4 max-w-lg text-base text-muted-foreground">
          {t('intelligence.emptyDesc')}
        </p>
        <Button className="mt-10 h-12 px-8" asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            {t('dashboard.newProject')}
          </Link>
        </Button>
      </div>
    );
  }

  const insight = buildDashboardInsights(stats);
  const readiness = buildReadinessMetrics(stats);
  const readinessItems = readiness.map((r) => ({
    label: t(r.labelKey),
    percent: r.percent,
    statusKey: r.statusKey,
  }));

  return (
    <div className="space-y-16 pb-16 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* 1. Hero */}
      <IntelligenceHero stats={stats} />

      {/* 2. Decision Summary — conclusion first */}
      {decision && activeProjectId && activeProjectTitle ? (
        <DecisionSummaryPanel
          decision={decision}
          projectId={activeProjectId}
          projectTitle={activeProjectTitle}
          detailHref={`/projects/${activeProjectId}/decision`}
        />
      ) : null}

      {decision?.marketAnalysis && activeProjectId ? (
        <MarketSnapshotPanel
          analysis={decision.marketAnalysis}
          projectId={activeProjectId}
          projectType={decision.projectType}
          variant="dashboard"
        />
      ) : null}

      {/* 3. AI Executive Summary */}
      <AiSummaryCard insight={insight} />

      {/* 3. Executive KPI */}
      <IntelligenceSection title={t('intelligence.readinessTitle')}>
        <ReadinessRingRow items={readinessItems} />
      </IntelligenceSection>

      {/* 4. Decision — WHY */}
      <IntelligenceSection title={t('intelligence.decisionTitle')} description={t('intelligence.decisionDesc')}>
        <div className="grid gap-6 xl:grid-cols-2">
          <KeyInsights insightKeys={insight.insightKeys} />
          <AiReasoning items={insight.reasoning} />
        </div>
      </IntelligenceSection>

      {/* 5. Action Center */}
      <IntelligenceSection
        title={t('intelligence.actionCenter')}
        description={t('intelligence.actionCenterDesc')}
      >
        <ActionCenter actions={stats.nextActions} />
      </IntelligenceSection>

      {/* 6. Charts */}
      <IntelligenceSection title={t('intelligence.chartsTitle')}>
        <div className="grid gap-6 xl:grid-cols-2">
          {stats.validationScore ? (
            <>
              <div className="rounded-2xl border border-border/50 bg-card p-10">
                <h3 className="mb-6 text-intelligence-card font-semibold tracking-tight">
                  {t('dashboard.validationRadar')}
                </h3>
                <ValidationScoreRadar score={stats.validationScore} />
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-10">
                <h3 className="mb-6 text-intelligence-card font-semibold tracking-tight">
                  {t('intelligence.riskHeatmap')}
                </h3>
                <RiskHeatmap score={stats.validationScore} />
              </div>
              <div className="rounded-2xl border border-border/50 bg-card p-10 xl:col-span-2">
                <h3 className="mb-6 text-intelligence-card font-semibold tracking-tight">
                  {t('intelligence.scoreBreakdown')}
                </h3>
                <ScoreBreakdown score={stats.validationScore} />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 p-16 text-center xl:col-span-2">
              <p className="text-muted-foreground">{t('dashboard.noScoreHint')}</p>
              <Button className="mt-6" asChild>
                <Link href={`/projects/${stats.project.id}/validation/new`}>
                  {t('dashboard.runValidation')}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </IntelligenceSection>

      {/* 7. Timeline */}
      <GrowthTimeline points={insight.timeline} />

      {/* 8. Expert Opinions — last */}
      <IntelligenceSection title={t('intelligence.expertTitle')} description={t('intelligence.expertDesc')}>
        <ExpertConsensus experts={insight.experts} />
      </IntelligenceSection>

      <div className="flex items-center justify-between border-t border-border/40 pt-8 text-[13px] text-muted-foreground">
        <span>{t('dashboard.projectCount', { count: projectCount })}</span>
        <span>
          {stats.recentActivity[0]
            ? t('dashboard.updatedAgo', {
                time: formatRelativeTime(new Date(stats.recentActivity[0].occurredAt)),
              })
            : null}
        </span>
      </div>
    </div>
  );
}
