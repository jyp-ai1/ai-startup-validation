'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ConfidenceLineagePanel } from '@/features/agents/orchestrator/components/confidence-lineage-panel';
import { DecisionDriversPanel } from '@/features/decision/components/decision-drivers-panel';
import type { WorkspaceContext } from '@/features/dashboard/types';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { ExecutiveWorkspaceViewModel } from '../services/executive-types';
import { ExecutiveActions } from './executive-actions';
import { ExecutiveDecisionStatus } from './executive-decision-status';
import { ExecutiveEvidence } from './executive-evidence';
import { ExecutiveExecutionStatus } from './executive-execution-status';
import { ExecutiveExportBar } from './executive-export-bar';
import { ExecutiveHero } from './executive-hero';
import { ExecutiveInbox } from './executive-inbox';
import { ExecutiveKeyMetrics } from './executive-key-metrics';
import { ExecutiveOpportunities } from './executive-opportunities';
import { ExecutiveRisks } from './executive-risks';
import { ExecutiveScenarioPlaceholder } from './executive-scenario-placeholder';
import { ExecutiveSummary } from './executive-summary';

type ExecutiveDashboardProps = {
  workspace: WorkspaceContext;
  executive: ExecutiveWorkspaceViewModel | null;
};

export function ExecutiveDashboard({ workspace, executive }: ExecutiveDashboardProps) {
  const t = useTranslations('executive');
  const { trackEvent } = useAnalytics();
  const { projectCount } = workspace;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.dashboardOpen, {
      project_id: executive?.project.id,
      project_type: executive?.projectType,
      screen: '/dashboard',
    });
  }, [executive, trackEvent]);

  if (!executive) {
    return (
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {t('empty.eyebrow')}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {t('empty.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
          {t('empty.desc')}
        </p>
        <Button className="mt-10 h-12 px-8" asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            {t('empty.cta')}
          </Link>
        </Button>
        <p className="mt-8 text-sm text-muted-foreground">
          {t('empty.projects', { count: projectCount })}
        </p>
      </div>
    );
  }

  const lineage = executive.orchestratorPlan?.confidenceLineage;

  return (
    <div className="mx-auto max-w-6xl space-y-14 pb-20 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ExecutiveHero workspace={executive} />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ExecutiveSummary
          summaryKeys={executive.summaryKeys}
          projectId={executive.project.id}
          projectType={executive.projectType}
        />
        <ExecutiveInbox items={executive.inbox} />
      </div>

      <ExecutiveDecisionStatus workspace={executive} />

      <ExecutiveKeyMetrics typeKpis={executive.typeKpis} keyMetrics={executive.keyMetrics} />

      <div className="grid gap-10 lg:grid-cols-2">
        <ExecutiveRisks risks={executive.risks} projectId={executive.project.id} />
        <ExecutiveOpportunities opportunities={executive.opportunities} />
      </div>

      <ExecutiveScenarioPlaceholder />

      <ExecutiveExecutionStatus plan={executive.orchestratorPlan} />

      <DecisionDriversPanel drivers={executive.decision.explanation.drivers} />

      {lineage ? <ConfidenceLineagePanel lineage={lineage} /> : null}

      <ExecutiveActions actions={executive.actions} projectId={executive.project.id} />

      <ExecutiveEvidence evidence={executive.evidence} />

      <ExecutiveExportBar projectId={executive.project.id} />
    </div>
  );
}
