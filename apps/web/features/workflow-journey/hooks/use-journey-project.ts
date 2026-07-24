'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  MOCK_PROJECTS,
  type MockProject,
  type MockProjectStatus,
} from '@/features/project-intelligence/constants/mock-projects';

const ID_KEY = 'll_journey_project_id';
const CUSTOM_KEY = 'll_journey_custom_projects';
const FAV_KEY = 'll_journey_favorites';

function loadCustomProjects(): MockProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MockProject[];
  } catch {
    return [];
  }
}

function saveCustomProjects(projects: MockProject[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(projects));
}

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(FAV_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...favs]));
}

function mergeProjects(custom: MockProject[], favorites: Set<string>): MockProject[] {
  const base = MOCK_PROJECTS.map((p) => ({
    ...p,
    isFavorite: favorites.has(p.id) || p.isFavorite,
  }));
  const customMerged = custom.map((p) => ({
    ...p,
    isFavorite: favorites.has(p.id),
  }));
  return [...customMerged, ...base.filter((p) => !custom.some((c) => c.id === p.id))];
}

export function useJourneyProject() {
  const [projectId, setProjectIdState] = useState(MOCK_PROJECTS[0]!.id);
  const [customProjects, setCustomProjects] = useState<MockProject[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(ID_KEY);
    const custom = loadCustomProjects();
    const favs = loadFavorites();
    setCustomProjects(custom);
    setFavorites(favs);
    const all = mergeProjects(custom, favs);
    if (stored && all.some((p) => p.id === stored)) {
      setProjectIdState(stored);
    }
    setReady(true);
  }, []);

  const allProjects = mergeProjects(customProjects, favorites);

  const setProjectId = useCallback((id: string) => {
    setProjectIdState(id);
    sessionStorage.setItem(ID_KEY, id);
  }, []);

  const project: MockProject = allProjects.find((p) => p.id === projectId) ?? allProjects[0]!;

  const recentProjects = allProjects
    .filter((p) => p.status !== 'archived')
    .slice(0, 5);

  const createProject = useCallback(
    (name: string): MockProject => {
      const created: MockProject = {
        id: `proj-custom-${Date.now()}`,
        name,
        goalLabel: '사업 가능성 검토',
        confidence: 45,
        verdict: 'HOLD',
        status: 'active' as MockProjectStatus,
        updatedAt: new Date().toISOString(),
      };
      const next = [created, ...customProjects];
      setCustomProjects(next);
      saveCustomProjects(next);
      return created;
    },
    [customProjects],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveFavorites(next);
        return next;
      });
    },
    [],
  );

  return {
    project,
    projectId,
    setProjectId,
    recentProjects,
    allProjects,
    createProject,
    toggleFavorite,
    ready,
  };
}
