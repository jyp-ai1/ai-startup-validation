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

function buildWorkspaceListUrl(authComplete: boolean): string {
  const qs = new URLSearchParams();
  if (authComplete) qs.set('auth', 'complete');
  const query = qs.toString();
  return query ? `/workspace?${query}` : '/workspace';
}

/** Single-hop destination after OAuth — project list unless ?project= is explicit. */
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
    return buildWorkspaceListUrl(authComplete);
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
  if (projects.length === 0 && promoteDemo) {
    await bootstrapFirstProject(userId, true);
    return `/workspace?promoted=1${authComplete ? '&auth=complete' : ''}`;
  }

  return buildWorkspaceListUrl(authComplete);
}
