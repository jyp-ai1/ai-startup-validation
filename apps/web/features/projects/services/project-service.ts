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

export async function listDemoProjects(): Promise<StartupProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getStartupProjectRepository();
  return repo.findAll({ is_demo: true });
}

export async function listUserProjects(userId: string): Promise<StartupProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getStartupProjectRepository();
  return repo.findAll({ user_id: userId, is_demo: false });
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
