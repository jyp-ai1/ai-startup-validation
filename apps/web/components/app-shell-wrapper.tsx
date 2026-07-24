import { getWorkspaceSession } from '@/lib/auth/workspace-session';
import { loadWatchCenter } from '@/features/watch-center/server';

import { AppShell } from './app-shell';
import { AppShellGate } from './app-shell-gate';

type AppShellWrapperProps = {
  children: React.ReactNode;
};

export async function AppShellWrapper({ children }: AppShellWrapperProps) {
  const session = await getWorkspaceSession();

  const activeProject = session.workspace.activeProject;
  const recentProjects = session.demoMode ? session.demoProjects : session.userProjects;
  const stats = session.workspace.stats;

  const watchCenter =
    activeProject && stats
      ? await loadWatchCenter({
          projectId: activeProject.id,
          userId: session.user?.id ?? null,
          stats,
        })
      : null;

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
          stats={stats}
          watchCenter={watchCenter}
        >
          {children}
        </AppShell>
      }
    >
      {children}
    </AppShellGate>
  );
}
