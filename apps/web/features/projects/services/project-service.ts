import { isSupabaseConfigured } from '@repo/db';
import type { StartupProject } from '@repo/types/validation';

import { getStartupProjectRepository } from '@/lib/db/platform';

export async function listStartupProjects(): Promise<StartupProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getStartupProjectRepository();
  return repo.findAll();
}

export async function findStartupProject(id: string): Promise<StartupProject | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getStartupProjectRepository();
  return repo.findById(id);
}

export function isStartupProjectsDbReady(): boolean {
  return isSupabaseConfigured();
}
