'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { ConfidenceLineagePanel } from '@/features/agents/orchestrator/components/confidence-lineage-panel';
import { DecisionDriversPanel } from '@/features/decision/components/decision-drivers-panel';
import type { WorkspaceContext } from '@/features/dashboard/types';
import { ANALYTICS_EVENTS } from '@/lib/analytics/types';
import { useAnalytics } from '@/lib/analytics/use-analytics';
import { Button } from '@repo/ui';

import type { ConsultantViewModel } from '@/features/ai-consultant';
import { ConsultantPanel } from '@/features/ai-consultant';
import { WelcomeChecklist } from '@/features/activation';
import { DashboardTodaysFocus } from '@/features/dashboard/components/dashboard-todays-focus';
import { OnboardingConsultantHost } from '@/features/onboarding-consultant';
import { DemoWelcomeCard } from '@/features/onboarding';

import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';
import { GuidedWorkspacePanel } from '@/features/strategy-workspace';

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
  strategy: StrategyWorkspaceViewModel | null;
  consultant: ConsultantViewModel | null;
  demoMode?: boolean;
  onboardingComplete?: boolean;
};

type DashboardShellProps = {
  consultant: ConsultantViewModel | null;
  children: ReactNode;
  className?: string;
  checklist?: ReactNode;
};

function DashboardShell({ consultant, children, className, checklist }: DashboardShellProps) {
  if (!consultant) {
    return <div className={className ?? 'mx-auto max-w-6xl'}>{children}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl pb-20">
      <div className="grid gap-8 xl:grid-cols-[1fr_minmax(320px,380px)]">
        <div className={className ?? 'min-w-0 space-y-14 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500'}>
          {children}
        </div>
        <div className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          {checklist}
          <ConsultantPanel consultant={consultant} />
        </div>
      </div>
    </div>
  );
}

export function ExecutiveDashboard({
  workspace,
  executive,
  strategy,
  consultant,
  demoMode = false,
  onboardingComplete = true,
}: ExecutiveDashboardProps) {
  const t = useTranslations('executive');
  const { trackEvent } = useAnalytics();
  const { projectCount, stats, activeProject } = workspace;

  const checklist =
    stats && activeProject && !demoMode ? (
      <WelcomeChecklist stats={stats} projectId={activeProject.id} />
    ) : null;

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.dashboardOpen, {
      project_id: executive?.project.id ?? workspace.activeProject?.id,
      project_type: executive?.projectType ?? workspace.activeProject?.projectType,
      screen: '/dashboard',
    });

    const seenKey = 'dashboard_first_open';
    if (typeof window !== 'undefined' && !sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      trackEvent(ANALYTICS_EVENTS.dashboardFirstOpen, {
        project_id: workspace.activeProject?.id,
        screen: '/dashboard',
      });
    }
  }, [executive, trackEvent, workspace.activeProject]);

  if (!executive && !strategy) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <DemoWelcomeCard className="mb-10" />
        <div className="py-12 text-center">
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
      </div>
    );
  }

  const projectTitle =
    executive?.project.title ?? workspace.activeProject?.title ?? t('empty.title');

  const focusPanel =
    workspace.activeProject && !demoMode ? (
      <DashboardTodaysFocus projectId={workspace.activeProject.id} />
    ) : null;

  if (!executive && strategy) {
    return (
      <>
        {workspace.activeProject ? (
          <OnboardingConsultantHost
            projectId={workspace.activeProject.id}
            projectTitle={workspace.activeProject.title}
            onboardingComplete={onboardingComplete}
            demoMode={demoMode}
          />
        ) : null}
        <DashboardShell consultant={consultant} checklist={checklist}>
        {focusPanel}
        {demoMode ? <DemoWelcomeCard projectId={strategy.projectId} className="mb-8" /> : null}
        <GuidedWorkspacePanel strategy={strategy} projectTitle={projectTitle} />
        </DashboardShell>
      </>
    );
  }

  if (!executive) {
    return null;
  }

  const lineage = executive.orchestratorPlan?.confidenceLineage;

  return (
    <>
      {workspace.activeProject ? (
        <OnboardingConsultantHost
          projectId={workspace.activeProject.id}
          projectTitle={workspace.activeProject.title}
          onboardingComplete={onboardingComplete}
          demoMode={demoMode}
        />
      ) : null}
      <DashboardShell consultant={consultant} checklist={checklist}>
      {focusPanel}
      {demoMode ? <DemoWelcomeCard projectId={executive.project.id} className="mb-8" /> : null}
      {strategy ? (
        <GuidedWorkspacePanel strategy={strategy} projectTitle={projectTitle} />
      ) : null}

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
      </DashboardShell>
    </>
  );
}
