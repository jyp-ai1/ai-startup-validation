import { headers } from 'next/headers';

import { getWorkspaceSession } from '@/lib/auth/workspace-session';
import { isDemoWorkspace } from '@/lib/auth/server-auth';
import { loadWatchCenter } from '@/features/watch-center/server';

import { AppShell } from './app-shell';
import { AppShellGate } from './app-shell-gate';

type AppShellWrapperProps = {
  children: React.ReactNode;
};

function shouldSkipAppShellData(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '' ||
    pathname.startsWith('/auth') ||
    pathname === '/who' ||
    pathname.startsWith('/who/') ||
    pathname === '/goal' ||
    pathname.startsWith('/goal/') ||
    pathname === '/workflow' ||
    pathname.startsWith('/workflow/') ||
    pathname === '/validation' ||
    pathname.startsWith('/validation/') ||
    pathname === '/investigate' ||
    pathname.startsWith('/investigate/') ||
    pathname === '/conclusion' ||
    pathname.startsWith('/conclusion/') ||
    pathname === '/execution' ||
    pathname.startsWith('/execution/')
  );
}

export async function AppShellWrapper({ children }: AppShellWrapperProps) {
  const pathname = (await headers()).get('x-pathname') ?? '/';
  const demoMode = await isDemoWorkspace();

  if (shouldSkipAppShellData(pathname) || (pathname.startsWith('/workspace') && demoMode)) {
    return <AppShellGate shell={null}>{children}</AppShellGate>;
  }

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
