'use client';

import type { ConsultantViewModel } from '@/features/ai-consultant';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { ProjectWorkspaceHome } from '@/features/workspace-home';
import type { WorkspaceHomeViewModel } from '@/features/workspace-home';
import type { StartupProject } from '@repo/types/validation';

type ProjectWorkspaceOverviewProps = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  consultant: ConsultantViewModel | null;
  workspaceHome: WorkspaceHomeViewModel;
};

/** Project Home — Notion-like workspace at `/projects/[id]`. */
export function ProjectWorkspaceOverview(props: ProjectWorkspaceOverviewProps) {
  return <ProjectWorkspaceHome {...props} />;
}
