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
  if (workspace.activeProject && workspace.stats) {
    const decision = await generateProjectDecision(workspace.activeProject.id);
    const orchestratorPlan = await getLatestPlan(workspace.activeProject.id);
    if (decision) {
      executive = buildExecutiveWorkspace(
        workspace.activeProject,
        workspace.stats,
        decision,
        orchestratorPlan,
      );
    }
  }

  return <ExecutiveDashboard workspace={workspace} executive={executive} />;
}
