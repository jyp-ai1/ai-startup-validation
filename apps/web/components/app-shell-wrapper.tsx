import { getWorkspaceSession } from '@/lib/auth/workspace-session';
import type { StartupProject } from '@repo/types/validation';

import { AppShell } from './app-shell';
import { AppShellGate } from './app-shell-gate';

type AppShellWrapperProps = {
  children: React.ReactNode;
};

export async function AppShellWrapper({ children }: AppShellWrapperProps) {
  const session = await getWorkspaceSession();

  const activeProject: Pick<StartupProject, 'id' | 'title' | 'status' | 'updatedAt'> | null =
    session.workspace.activeProject
      ? {
          id: session.workspace.activeProject.id,
          title: session.workspace.activeProject.title,
          status: session.workspace.activeProject.status,
          updatedAt: session.workspace.activeProject.updatedAt,
        }
      : null;

  const recentProjects = session.demoMode ? session.demoProjects : session.userProjects;

  return (
    <AppShellGate
      shell={
        <AppShell
          activeProject={activeProject}
          recentProjects={recentProjects}
          user={session.user}
          demoMode={session.demoMode}
          userProjects={session.userProjects}
          demoProjects={session.demoProjects}
          stats={session.workspace.stats}
        >
          {children}
        </AppShell>
      }
    >
      {children}
    </AppShellGate>
  );
}
