'use client';

import { useEffect, useRef } from 'react';

import {
  resetProjectContext,
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
    } else if (previousProjectId.current && previousProjectId.current !== projectId) {
      switchProjectContext(projectId);
    } else {
      switchProjectContext(projectId);
    }

    previousProjectId.current = projectId;
  }, [isNewProject, projectId]);

  return null;
}
