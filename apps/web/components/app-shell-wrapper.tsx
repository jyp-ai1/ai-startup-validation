import { getWorkspaceSession } from '@/lib/auth/workspace-session';

import { AppShell } from './app-shell';
import { AppShellGate } from './app-shell-gate';

type AppShellWrapperProps = {
  children: React.ReactNode;
};

export async function AppShellWrapper({ children }: AppShellWrapperProps) {
  const session = await getWorkspaceSession();

  const activeProject = session.workspace.activeProject;
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
