'use client';

import { useEffect } from 'react';

import {
  getActiveProjectId,
  resetProjectContext,
  setActiveProjectId,
} from '@/lib/project/project-context-store';

type ProjectScopeTrackerProps = {
  projectId: string;
  isNewProject?: boolean;
};

/** Enforce activeProjectId on every project change; reset cache for new projects. */
export function ProjectScopeTracker({ projectId, isNewProject = false }: ProjectScopeTrackerProps) {
  useEffect(() => {
    if (isNewProject) {
      resetProjectContext(projectId);
      return;
    }

    const active = getActiveProjectId();
    if (active !== projectId) {
      setActiveProjectId(projectId);
    }
  }, [isNewProject, projectId]);

  return null;
}
