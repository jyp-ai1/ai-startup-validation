'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  InternalServerError,
  NotFoundError,
  ValidationError,
} from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { StartupProject } from '@repo/types/validation';

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

export async function getProjects(): Promise<StartupProject[]> {
  return listStartupProjects();
}

export async function getProject(id: string): Promise<StartupProject | null> {
  return findStartupProject(id);
}

function assertDbConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new InternalServerError(
      'Database is not configured. Add Supabase environment variables and run migration 002_startup_projects.sql.',
    );
  }
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
    });

    const repo = getStartupProjectRepository();
    const project = await repo.create(input);

    revalidatePath('/projects');
    revalidatePath('/dashboard');
    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
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

    const repo = getStartupProjectRepository();
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
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteProject(id: string): Promise<void> {
  assertDbConfigured();
  const repo = getStartupProjectRepository();
  const existing = await repo.findById(id);
  if (!existing) {
    throw new NotFoundError(`Startup project not found: ${id}`);
  }

  await repo.delete(id);
  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect('/projects');
}
