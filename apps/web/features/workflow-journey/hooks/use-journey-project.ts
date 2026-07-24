'use client';

import { useCallback, useEffect, useState } from 'react';

import { MOCK_PROJECTS, type MockProject } from '@/features/project-intelligence/constants/mock-projects';

const STORAGE_KEY = 'll_journey_project_id';

export function useJourneyProject() {
  const [projectId, setProjectIdState] = useState(MOCK_PROJECTS[0]!.id);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && MOCK_PROJECTS.some((p) => p.id === stored)) {
      setProjectIdState(stored);
    }
    setReady(true);
  }, []);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    sessionStorage.setItem(STORAGE_KEY, id);
  }, []);

  const project: MockProject =
    MOCK_PROJECTS.find((p) => p.id === projectId) ?? MOCK_PROJECTS[0]!;

  const recentProjects = MOCK_PROJECTS.filter((p) => p.status !== 'archived').slice(0, 3);

  return { project, projectId, setProjectId, recentProjects, ready };
}
