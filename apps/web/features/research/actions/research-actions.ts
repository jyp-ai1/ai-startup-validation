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
import type { ResearchPlan } from '@repo/types/validation';

import { getResearchPlanRepository } from '@/lib/db/platform';
import { findStartupProject } from '@/features/projects/services/project-service';

import {
  createResearchPlanSchema,
  formDataToObject,
  updateResearchPlanSchema,
} from '../schemas/research-schema';
import { findResearchPlan, listResearchPlans } from '../services/research-service';

export type ResearchActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): ResearchActionState {
  return {
    error: error.message,
    fieldErrors: error.details as Record<string, string[]> | undefined,
  };
}

function assertDbConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new InternalServerError(
      'Database is not configured. Add Supabase environment variables and run migrations.',
    );
  }
}

function researchPaths(projectId: string, researchId?: string) {
  const base = `/projects/${projectId}/research`;
  return {
    list: base,
    detail: researchId ? `${base}/${researchId}` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

export async function getResearchPlans(
  projectId: string,
): Promise<ResearchPlan[]> {
  return listResearchPlans(projectId);
}

export async function getResearchPlan(
  projectId: string,
  researchId: string,
): Promise<ResearchPlan | null> {
  const plan = await findResearchPlan(researchId);
  if (!plan || plan.projectId !== projectId) {
    return null;
  }
  return plan;
}

export async function createResearchPlan(
  projectId: string,
  _prevState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const input = parseWithSchema(createResearchPlanSchema, {
      title: raw.title,
      researchType: raw.researchType,
      description: emptyToNull(raw.description),
      priority: raw.priority || undefined,
    });

    const repo = getResearchPlanRepository();
    const plan = await repo.create({
      projectId,
      ...input,
    });

    revalidatePath(researchPaths(projectId).list);
    revalidatePath(`/projects/${projectId}`);
    redirect(researchPaths(projectId, plan.id).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateResearchPlan(
  projectId: string,
  researchId: string,
  _prevState: ResearchActionState,
  formData: FormData,
): Promise<ResearchActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const input = parseWithSchema(updateResearchPlanSchema, {
      title: raw.title,
      researchType: raw.researchType || undefined,
      description: emptyToNull(raw.description),
      priority: raw.priority || undefined,
      status: raw.status || undefined,
    });

    const repo = getResearchPlanRepository();
    const existing = await getResearchPlan(projectId, researchId);
    if (!existing) {
      throw new NotFoundError(`Research plan not found: ${researchId}`);
    }

    await repo.update(researchId, input);

    revalidatePath(researchPaths(projectId).list);
    revalidatePath(researchPaths(projectId, researchId).detail);
    redirect(researchPaths(projectId, researchId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteResearchPlan(
  projectId: string,
  researchId: string,
): Promise<void> {
  assertDbConfigured();

  const repo = getResearchPlanRepository();
  const existing = await getResearchPlan(projectId, researchId);
  if (!existing) {
    throw new NotFoundError(`Research plan not found: ${researchId}`);
  }

  await repo.delete(researchId);
  revalidatePath(researchPaths(projectId).list);
  revalidatePath(`/projects/${projectId}`);
  redirect(researchPaths(projectId).list);
}
