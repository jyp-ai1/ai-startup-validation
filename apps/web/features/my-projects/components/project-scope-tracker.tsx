'use client';

import { useEffect, useRef } from 'react';

import {
  getActiveProjectId,
  resetProjectContext,
  setActiveProjectId,
} from '@/lib/project/project-context-store';

type ProjectScopeTrackerProps = {
  projectId: string;
  isNewProject?: boolean;
};

/** P0-2 / P0-3 — enforce activeProjectId and reset context for new projects. */
export function ProjectScopeTracker({ projectId, isNewProject = false }: ProjectScopeTrackerProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

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
