import { cookies } from 'next/headers';

import { getWorkspaceContext } from '@/features/dashboard/services/dashboard-service';
import { listStartupProjects } from '@/features/projects/services/project-service';
import type { StartupProject } from '@repo/types/validation';

import { AppShell } from './app-shell';
import { AppShellGate } from './app-shell-gate';

type AppShellWrapperProps = {
  children: React.ReactNode;
};

export async function AppShellWrapper({ children }: AppShellWrapperProps) {
  const cookieStore = await cookies();
  const preferredProjectId = cookieStore.get('ACTIVE_PROJECT_ID')?.value ?? null;
  const workspace = await getWorkspaceContext(preferredProjectId);
  const projects = await listStartupProjects();
  const recentProjects = projects
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6)
    .map((p) => ({ id: p.id, title: p.title }));

  const activeProject: Pick<StartupProject, 'id' | 'title' | 'status' | 'updatedAt'> | null =
    workspace.activeProject
      ? {
          id: workspace.activeProject.id,
          title: workspace.activeProject.title,
          status: workspace.activeProject.status,
          updatedAt: workspace.activeProject.updatedAt,
        }
      : null;

  return (
    <AppShellGate
      shell={
        <AppShell activeProject={activeProject} recentProjects={recentProjects}>
          {children}
        </AppShell>
      }
    >
      {children}
    </AppShellGate>
  );
}
