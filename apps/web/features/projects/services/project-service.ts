import { ForbiddenError, NotFoundError } from '@repo/core/errors';
import { isSupabaseConfigured } from '@repo/db';
import type { CreateStartupProjectInput, StartupProject } from '@repo/types/validation';

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
  try {
    return await repo.findAll({ is_demo: true });
  } catch {
    // Migration 016 not applied — fall back to seed projects
    const all = await repo.findAll();
    return all.filter((p) => p.isDemo || p.title.includes('실버'));
  }
}

export async function listUserProjects(userId: string): Promise<StartupProject[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getStartupProjectRepository();
  try {
    return await repo.findAll({ user_id: userId, is_demo: false });
  } catch {
    // Migration 016 not applied — no user-scoped projects yet
    return [];
  }
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

function assertOwned(project: StartupProject, userId: string): void {
  if (project.isDemo || project.userId !== userId) {
    throw new ForbiddenError('Project access denied');
  }
}

/** List projects for authenticated user (Sprint 1.1). */
export async function listOwnedProjects(userId: string): Promise<StartupProject[]> {
  return listUserProjects(userId);
}

/** Get project if owned by user. */
export async function getOwnedProject(
  userId: string,
  projectId: string,
): Promise<StartupProject | null> {
  const project = await findStartupProject(projectId);
  if (!project) return null;
  if (project.isDemo || project.userId !== userId) return null;
  return project;
}

/** Create project scoped to user (Sprint 1.1). */
export async function createOwnedProject(
  userId: string,
  input: Pick<CreateStartupProjectInput, 'title' | 'summary'>,
): Promise<StartupProject> {
  if (!isSupabaseConfigured()) {
    throw new Error('Database not configured');
  }

  const repo = getStartupProjectRepository();
  return repo.create({
    title: input.title,
    summary: input.summary,
    userId,
    isDemo: false,
    status: 'DRAFT',
  });
}

export async function assertProjectOwner(userId: string, projectId: string): Promise<StartupProject> {
  const project = await getOwnedProject(userId, projectId);
  if (!project) {
    throw new NotFoundError(`Project not found: ${projectId}`);
  }
  return project;
}
