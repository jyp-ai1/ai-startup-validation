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
import type {
  GovernmentGrant,
  GrantDashboard,
  GrantListFilter,
} from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getGovernmentGrantRepository } from '@/lib/db/platform';

import {
  createGrantSchema,
  formDataToObject,
  updateGrantSchema,
} from '../schemas/grant-schema';
import {
  buildGrantDashboard,
  findGrant,
  listGrants,
} from '../services/grant-service';

export type GrantActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const NONE_VALUE = 'NONE';

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseOptionalEnum(value: string | undefined | null): string | null {
  if (!value || value === NONE_VALUE) return null;
  return value;
}

function parseOptionalFitScore(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null;
  return Number(value);
}

function mapValidationError(error: ValidationError): GrantActionState {
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

function grantPaths(projectId: string, grantId?: string) {
  const base = `/projects/${projectId}/grants`;
  return {
    list: base,
    dashboard: `${base}/dashboard`,
    detail: grantId ? `${base}/${grantId}` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

function parseFormGrant(raw: Record<string, string>) {
  return {
    name: raw.name,
    organization: raw.organization,
    description: emptyToNull(raw.description),
    category: parseOptionalEnum(raw.category),
    targetStage: parseOptionalEnum(raw.targetStage),
    supportType: parseOptionalEnum(raw.supportType),
    amount: emptyToNull(raw.amount),
    deadline: emptyToNull(raw.deadline),
    eligibility: emptyToNull(raw.eligibility),
    applicationUrl: emptyToNull(raw.applicationUrl),
    fitScore: parseOptionalFitScore(raw.fitScore),
    status: raw.status || 'OPEN',
  };
}

export async function getGrantList(
  projectId: string,
  filter?: GrantListFilter,
): Promise<GovernmentGrant[]> {
  return listGrants(projectId, filter);
}

export async function getGrantDetail(
  projectId: string,
  grantId: string,
): Promise<GovernmentGrant | null> {
  const grant = await findGrant(grantId);
  if (!grant || grant.projectId !== projectId) {
    return null;
  }
  return grant;
}

export async function getGrantDashboard(projectId: string): Promise<GrantDashboard> {
  await assertProjectExists(projectId);
  return buildGrantDashboard(projectId);
}

export async function createGrant(
  projectId: string,
  _prevState: GrantActionState,
  formData: FormData,
): Promise<GrantActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormGrant(raw);
    const input = parseWithSchema(createGrantSchema, parsed);

    const repo = getGovernmentGrantRepository();
    const grant = await repo.create({
      projectId,
      ...input,
    });

    revalidatePath(grantPaths(projectId).list);
    revalidatePath(grantPaths(projectId).dashboard);
    revalidatePath(`/projects/${projectId}`);
    redirect(grantPaths(projectId, grant.id).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateGrant(
  projectId: string,
  grantId: string,
  _prevState: GrantActionState,
  formData: FormData,
): Promise<GrantActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormGrant(raw);
    const input = parseWithSchema(updateGrantSchema, parsed);

    const repo = getGovernmentGrantRepository();
    const existing = await getGrantDetail(projectId, grantId);
    if (!existing) {
      throw new NotFoundError(`Grant not found: ${grantId}`);
    }

    await repo.update(grantId, input);

    revalidatePath(grantPaths(projectId).list);
    revalidatePath(grantPaths(projectId).dashboard);
    revalidatePath(grantPaths(projectId, grantId).detail);
    redirect(grantPaths(projectId, grantId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteGrant(
  projectId: string,
  grantId: string,
): Promise<void> {
  assertDbConfigured();

  const repo = getGovernmentGrantRepository();
  const existing = await getGrantDetail(projectId, grantId);
  if (!existing) {
    throw new NotFoundError(`Grant not found: ${grantId}`);
  }

  await repo.delete(grantId);
  revalidatePath(grantPaths(projectId).list);
  revalidatePath(grantPaths(projectId).dashboard);
  revalidatePath(`/projects/${projectId}`);
  redirect(grantPaths(projectId).list);
}
