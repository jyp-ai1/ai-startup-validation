'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import {
  InternalServerError,
  NotFoundError,
  ValidationError,
} from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured, SupabaseStartupProjectRepository } from '@repo/db';
import type { CreateStartupProjectInput, StartupProject } from '@repo/types/validation';

import { getStartupProjectRepository } from '@/lib/db/platform';

import {
  createStartupProjectSchema,
  formDataToObject,
  updateStartupProjectSchema,
} from '../schemas/project-schema';
import { findStartupProject, listStartupProjects } from '../services/project-service';

export type ProjectActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): ProjectActionState {
  return {
    error: error.message,
    fieldErrors: error.details as Record<string, string[]> | undefined,
  };
}

async function localizeValidationState(state: ProjectActionState): Promise<ProjectActionState> {
  if (!state.fieldErrors) return state;
  const t = await getTranslations();
  return {
    ...state,
    fieldErrors: Object.fromEntries(
      Object.entries(state.fieldErrors).map(([field, messages]) => [
        field,
        messages.map((message) => {
          try {
            return t(message as 'projects.validation.titleRequired');
          } catch {
            return message;
          }
        }),
      ]),
    ),
  };
}

export async function getProjects(): Promise<StartupProject[]> {
  return listStartupProjects();
}

export async function getProject(id: string): Promise<StartupProject | null> {
  return findStartupProject(id);
}

function getRepo(): SupabaseStartupProjectRepository {
  return getStartupProjectRepository() as SupabaseStartupProjectRepository;
}

function assertDbConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new InternalServerError(
      'Database is not configured. Add Supabase environment variables and run migrations through 020_project_crud_extras.sql.',
    );
  }
}

function revalidateProjectPaths(id?: string): void {
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  if (id) revalidatePath(`/projects/${id}`);
}

export async function createProject(
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    assertDbConfigured();
    const raw = formDataToObject(formData);
    const input = parseWithSchema(createStartupProjectSchema, {
      title: raw.title,
      summary: raw.summary,
      problem: emptyToNull(raw.problem),
      solution: emptyToNull(raw.solution),
      targetCustomer: emptyToNull(raw.targetCustomer),
      industry: emptyToNull(raw.industry),
      businessModel: emptyToNull(raw.businessModel),
      projectType: (raw.projectType as CreateStartupProjectInput['projectType']) || 'STARTUP',
    });

    const repo = getRepo();
    const project = await repo.create(input);

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return localizeValidationState(mapValidationError(error));
    }
    if (error instanceof InternalServerError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function updateProject(
  id: string,
  _prevState: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  try {
    assertDbConfigured();
    const raw = formDataToObject(formData);
    const input = parseWithSchema(updateStartupProjectSchema, {
      title: raw.title,
      summary: raw.summary,
      problem: emptyToNull(raw.problem),
      solution: emptyToNull(raw.solution),
      targetCustomer: emptyToNull(raw.targetCustomer),
      industry: emptyToNull(raw.industry),
      businessModel: emptyToNull(raw.businessModel),
      status: raw.status || undefined,
    });

    const repo = getRepo();
    const existing = await repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Startup project not found: ${id}`);
    }

    await repo.update(id, input);

    revalidatePath('/projects');
    revalidatePath(`/projects/${id}`);
    redirect(`/projects/${id}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return localizeValidationState(mapValidationError(error));
    }
    if (error instanceof InternalServerError) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  assertDbConfigured();
  const repo = getRepo();
  const existing = await repo.findById(id);
  if (!existing) {
    throw new NotFoundError(`Startup project not found: ${id}`);
  }

  await repo.softDelete(id);
  revalidateProjectPaths(id);
}

export async function restoreProject(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const repo = getRepo();
    await repo.restore(id);
    revalidateProjectPaths(id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Restore failed',
    };
  }
}

export async function duplicateProject(
  id: string,
): Promise<{ ok: true; projectId: string } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const repo = getRepo();
    const project = await repo.duplicate(id);
    revalidateProjectPaths(project.id);
    return { ok: true, projectId: project.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Duplicate failed',
    };
  }
}

export async function archiveProject(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const repo = getRepo();
    await repo.archive(id);
    revalidateProjectPaths(id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Archive failed' };
  }
}

export async function unarchiveProject(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const repo = getRepo();
    await repo.unarchive(id);
    revalidateProjectPaths(id);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unarchive failed' };
  }
}

export async function toggleProjectPin(id: string): Promise<{ ok: true; isPinned: boolean } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const repo = getRepo();
    const project = await repo.togglePin(id);
    revalidateProjectPaths(id);
    return { ok: true, isPinned: project.isPinned };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Pin failed' };
  }
}

export async function patchProjectFields(
  id: string,
  fields: { title?: string; summary?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    assertDbConfigured();
    const input = parseWithSchema(updateStartupProjectSchema, fields);
    const repo = getRepo();
    const existing = await repo.findById(id);
    if (!existing) {
      throw new NotFoundError(`Startup project not found: ${id}`);
    }
    await repo.update(id, input);
    revalidateProjectPaths(id);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Save failed',
    };
  }
}

export async function permanentlyDeleteProject(id: string): Promise<void> {
  assertDbConfigured();
  const repo = getRepo();
  const existing = await repo.findById(id);
  if (!existing) {
    throw new NotFoundError(`Startup project not found: ${id}`);
  }

  await repo.delete(id);
  revalidateProjectPaths();
  redirect('/projects');
}
