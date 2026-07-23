import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { IntelligenceDashboard } from '@/features/dashboard/components/intelligence-dashboard';
import { getWorkspaceContext } from '@/features/dashboard/services/dashboard-service';
import { generateProjectDecision } from '@/features/decision';
import { getAgentActivityStats } from '@/features/agents/research';
import { cookies } from 'next/headers';

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
  const decision = workspace.activeProject
    ? await generateProjectDecision(workspace.activeProject.id)
    : null;
  const agentActivity = await getAgentActivityStats();

  return (
    <IntelligenceDashboard
      workspace={workspace}
      decision={decision}
      agentActivity={agentActivity}
      activeProjectId={workspace.activeProject?.id ?? null}
      activeProjectTitle={workspace.activeProject?.title ?? null}
    />
  );
}
