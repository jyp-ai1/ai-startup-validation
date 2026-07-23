export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getLatestPlan } from '@/features/agents/orchestrator';
import { buildConsultantViewModel } from '@/features/ai-consultant';
import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { generateProjectDecision } from '@/features/decision';
import { buildExecutiveWorkspace } from '@/features/executive';
import {
  getProjectOnboardingContext,
  parseOnboardingContext,
} from '@/features/onboarding-consultant';
import { ProjectDetail, ProjectWorkspaceOverview } from '@/features/projects';
import { getProject } from '@/features/projects/actions/project-actions';
import { getExecutiveReport } from '@/features/report-engine';
import { listReports } from '@/features/reports/services/report-service';
import { buildStrategyWorkspace } from '@/features/strategy-workspace';
import { loadProjectIntelligence } from '@/features/project-intelligence/server';
import { buildWorkspaceHomeViewModel } from '@/features/workspace-home';

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);

  return {
    title: project ? `${project.title} | LaunchLens` : 'Project | LaunchLens',
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    notFound();
  }

  const stats = await buildProjectDashboardStats(id);

  if (!stats) {
    return <ProjectDetail project={project} />;
  }

  const [decision, orchestratorPlan, executiveReport, reports] = await Promise.all([
    generateProjectDecision(id),
    getLatestPlan(id),
    getExecutiveReport(id),
    listReports(id),
  ]);

  const hasExecutiveReport = Boolean(executiveReport);

  let executive = null;
  if (decision) {
    executive = buildExecutiveWorkspace(project, stats, decision, orchestratorPlan);
  }

  const strategy = buildStrategyWorkspace({
    stats,
    executive,
    hasExecutiveReport,
  });

  const onboardingContext =
    parseOnboardingContext(project.onboardingContext) ??
    (await getProjectOnboardingContext(id));

  const consultant = buildConsultantViewModel({
    stats,
    executive,
    strategy,
    hasExecutiveReport,
    orchestratorPlan,
    onboardingContext,
  });

  const intelligence = await loadProjectIntelligence({
    project,
    stats,
    executive,
    strategy,
    onboardingContext,
    hasExecutiveReport,
    orchestratorPlan,
  });

  const workspaceHome = buildWorkspaceHomeViewModel({
    project,
    stats,
    strategy,
    consultant,
    reports,
    hasExecutiveReport,
  });

  return (
    <ProjectWorkspaceOverview
      project={project}
      stats={stats}
      consultant={consultant}
      intelligence={intelligence}
      workspaceHome={workspaceHome}
    />
  );
}
