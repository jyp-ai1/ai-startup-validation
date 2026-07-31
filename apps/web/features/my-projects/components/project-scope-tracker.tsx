'use client';

import { useEffect, useRef } from 'react';

import {
  clearLegacyGlobalKeys,
  resetProjectContext,
  setActiveProjectId,
  switchProjectContext,
} from '@/lib/project/project-context-store';

type ProjectScopeTrackerProps = {
  projectId: string;
  isNewProject?: boolean;
};

/** Enforce activeProjectId on every project change; reset cache for new projects. */
export function ProjectScopeTracker({ projectId, isNewProject = false }: ProjectScopeTrackerProps) {
  const previousProjectId = useRef<string | null>(null);

  useEffect(() => {
    if (isNewProject) {
      resetProjectContext(projectId);
    } else if (!previousProjectId.current) {
      setActiveProjectId(projectId);
      clearLegacyGlobalKeys();
    } else if (previousProjectId.current !== projectId) {
      switchProjectContext(projectId);
    }

    previousProjectId.current = projectId;
  }, [isNewProject, projectId]);

  return null;
}
