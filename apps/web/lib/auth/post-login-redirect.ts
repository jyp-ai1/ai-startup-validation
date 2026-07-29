import { isSupabaseConfigured } from '@repo/db';

import { bootstrapFirstProject } from '@/features/my-projects/actions/my-project-actions';
import {
  getOwnedProject,
  listOwnedProjects,
} from '@/features/projects/services/project-service';

import { buildAuthenticatedJourneyUrl } from './journey-routes';

type ResolvePostLoginOptions = {
  authComplete?: boolean;
  promoteDemo?: boolean;
  safeNext: string;
};

/** Single-hop destination after OAuth — never bare `/workspace?auth=complete`. */
export async function resolvePostLoginWorkspaceUrl(
  userId: string,
  { authComplete = true, promoteDemo = false, safeNext }: ResolvePostLoginOptions,
): Promise<string> {
  const parsed = new URL(safeNext.startsWith('/') ? safeNext : '/workspace', 'http://local');
  const fromDemo = parsed.searchParams.get('from') === 'demo';
  const promote = parsed.searchParams.get('promote') === '1' || promoteDemo;
  const projectFromNext = parsed.searchParams.get('project');

  if (fromDemo && promote) {
    const qs = new URLSearchParams();
    qs.set('from', 'demo');
    qs.set('promote', '1');
    if (authComplete) qs.set('auth', 'complete');
    return `/workspace?${qs.toString()}`;
  }

  if (!isSupabaseConfigured()) {
    const qs = new URLSearchParams(parsed.searchParams);
    if (authComplete) qs.set('auth', 'complete');
    const query = qs.toString();
    return query ? `/workspace?${query}` : '/workspace?auth=complete';
  }

  if (projectFromNext) {
    const owned = await getOwnedProject(userId, projectFromNext);
    if (owned) {
      return buildAuthenticatedJourneyUrl({
        projectId: projectFromNext,
        authComplete,
        welcome: parsed.searchParams.get('welcome') === '1',
        promoted: parsed.searchParams.get('promoted') === '1',
      });
    }
  }

  const projects = await listOwnedProjects(userId);
  if (projects.length === 0) {
    const project = await bootstrapFirstProject(userId, promoteDemo);
    return buildAuthenticatedJourneyUrl({
      projectId: project.id,
      welcome: true,
      authComplete,
    });
  }

  return buildAuthenticatedJourneyUrl({
    projectId: projects[0]!.id,
    authComplete,
  });
}
