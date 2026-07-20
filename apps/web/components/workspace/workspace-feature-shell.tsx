import type { WorkspaceFeature } from '@/lib/workspace-insights';

import { buildProjectDashboardStats } from '@/features/dashboard/services/dashboard-service';
import { buildFeatureInsightHighlights } from '@/lib/workspace-insights';

import { WorkspaceFeatureShellClient } from './workspace-feature-shell-client';

type WorkspaceFeatureShellProps = {
  projectId: string;
  feature?: WorkspaceFeature;
  children: React.ReactNode;
};

export async function WorkspaceFeatureShell({
  projectId,
  feature = 'default',
  children,
}: WorkspaceFeatureShellProps) {
  const stats = await buildProjectDashboardStats(projectId);

  return (
    <WorkspaceFeatureShellClient
      projectId={projectId}
      nextActions={stats?.nextActions ?? []}
      highlights={buildFeatureInsightHighlights(feature, stats)}
    >
      {children}
    </WorkspaceFeatureShellClient>
  );
}
