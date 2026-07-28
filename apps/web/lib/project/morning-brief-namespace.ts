import { getActiveProjectId, workspaceLastVisitKey } from './project-context-store';

export type MorningBriefNamespace = 'firstInvestigation' | 'investigation' | 'investigationSample';

/** First session = welcome/promoted or no prior workspace visit for this project. */
export function resolveMorningBriefNamespace(options?: {
  projectId?: string | null;
  welcome?: boolean;
  promoted?: boolean;
}): MorningBriefNamespace {
  if (options?.welcome || options?.promoted) {
    return 'firstInvestigation';
  }

  const projectId = options?.projectId ?? getActiveProjectId();
  if (!projectId || typeof window === 'undefined') {
    return 'firstInvestigation';
  }

  const lastVisit = localStorage.getItem(workspaceLastVisitKey(projectId));
  return lastVisit ? 'investigationSample' : 'firstInvestigation';
}
