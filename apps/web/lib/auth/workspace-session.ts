import { cookies } from 'next/headers';

import { getWorkspaceContext } from '@/features/dashboard/services/dashboard-service';
import type { WorkspaceContext } from '@/features/dashboard/types';
import {
  listDemoProjects,
  listUserProjects,
} from '@/features/projects/services/project-service';
import type { StartupProject } from '@repo/types/validation';

import {
  DEMO_MODE_VALUE,
  getServerAuthUser,
  getWorkspaceMode,
  isDemoWorkspace,
  WORKSPACE_MODE_COOKIE,
  type AppAuthUser,
} from './server-auth';

export type WorkspaceSession = {
  user: AppAuthUser | null;
  demoMode: boolean;
  preferredProjectId: string | null;
  workspace: WorkspaceContext;
  userProjects: Pick<StartupProject, 'id' | 'title'>[];
  demoProjects: Pick<StartupProject, 'id' | 'title'>[];
};

export async function getWorkspaceSession(
  overrideProjectId?: string | null,
): Promise<WorkspaceSession> {
  const cookieStore = await cookies();
  const user = await getServerAuthUser();
  const demoMode = await isDemoWorkspace();
  const preferredProjectId =
    overrideProjectId ?? cookieStore.get('ACTIVE_PROJECT_ID')?.value ?? null;

  const workspace = await getWorkspaceContext(preferredProjectId, {
    userId: demoMode ? null : user?.id ?? null,
    demoMode,
  });

  const [userProjects, demoProjects] = await Promise.all([
    user ? listUserProjects(user.id) : Promise.resolve([]),
    listDemoProjects(),
  ]);

  const mapRecent = (projects: StartupProject[]) =>
    [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6)
      .map((p) => ({ id: p.id, title: p.title }));

  return {
    user,
    demoMode,
    preferredProjectId,
    workspace,
    userProjects: mapRecent(userProjects),
    demoProjects: mapRecent(demoProjects),
  };
}

export { WORKSPACE_MODE_COOKIE, DEMO_MODE_VALUE, getWorkspaceMode, getServerAuthUser };
