import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { cookies } from 'next/headers';

import { getLatestPlan } from '@/features/agents/orchestrator';
import { getWorkspaceContext } from '@/features/dashboard/services/dashboard-service';
import { generateProjectDecision } from '@/features/decision';
import {
  buildExecutiveWorkspace,
  ExecutiveDashboard,
} from '@/features/executive';
import { getExecutiveReport } from '@/features/report-engine';
import { buildStrategyWorkspace } from '@/features/strategy-workspace';
import { buildConsultantViewModel } from '@/features/ai-consultant';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t('nav.dashboard')} | ${t('meta.titleSuffix')}`,
  };
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const preferredProjectId = cookieStore.get('ACTIVE_PROJECT_ID')?.value ?? null;
  const workspace = await getWorkspaceContext(preferredProjectId);

  let executive = null;
  let strategy = null;
  let consultant = null;
  if (workspace.activeProject && workspace.stats) {
    const projectId = workspace.activeProject.id;
    const decision = await generateProjectDecision(projectId);
    const orchestratorPlan = await getLatestPlan(projectId);
    const executiveReport = await getExecutiveReport(projectId);
    if (decision) {
      executive = buildExecutiveWorkspace(
        workspace.activeProject,
        workspace.stats,
        decision,
        orchestratorPlan,
      );
    }
    strategy = buildStrategyWorkspace({
      stats: workspace.stats,
      executive,
      hasExecutiveReport: Boolean(executiveReport),
    });
    consultant = buildConsultantViewModel({
      stats: workspace.stats,
      executive,
      strategy,
      hasExecutiveReport: Boolean(executiveReport),
      orchestratorPlan,
    });
  }

  return (
    <ExecutiveDashboard
      workspace={workspace}
      executive={executive}
      strategy={strategy}
      consultant={consultant}
    />
  );
}
