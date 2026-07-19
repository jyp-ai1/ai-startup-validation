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
  Competitor,
  CompetitorComparison,
} from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getCompetitorRepository } from '@/lib/db/platform';

import {
  createCompetitorSchema,
  formDataToObject,
  updateCompetitorSchema,
} from '../schemas/competitor-schema';
import {
  buildCompetitorComparison,
  findCompetitor,
  listCompetitors,
} from '../services/competitor-service';

export type CompetitorActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const NONE_VALUE = 'NONE';

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseOptionalMarketPosition(
  value: string | undefined | null,
): string | null {
  if (!value || value === NONE_VALUE) return null;
  return value;
}

function mapValidationError(error: ValidationError): CompetitorActionState {
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

function competitorPaths(projectId: string, competitorId?: string) {
  const base = `/projects/${projectId}/competitors`;
  return {
    list: base,
    compare: `${base}/compare`,
    detail: competitorId ? `${base}/${competitorId}` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

function parseFormCompetitor(raw: Record<string, string>) {
  return {
    name: raw.name,
    category: raw.category,
    description: emptyToNull(raw.description),
    website: emptyToNull(raw.website),
    targetCustomer: emptyToNull(raw.targetCustomer),
    businessModel: emptyToNull(raw.businessModel),
    pricing: emptyToNull(raw.pricing),
    strengths: emptyToNull(raw.strengths),
    weaknesses: emptyToNull(raw.weaknesses),
    differentiation: emptyToNull(raw.differentiation),
    marketPosition: parseOptionalMarketPosition(raw.marketPosition),
  };
}

export async function getCompetitors(projectId: string): Promise<Competitor[]> {
  return listCompetitors(projectId);
}

export async function getCompetitor(
  projectId: string,
  competitorId: string,
): Promise<Competitor | null> {
  const competitor = await findCompetitor(competitorId);
  if (!competitor || competitor.projectId !== projectId) {
    return null;
  }
  return competitor;
}

export async function compareCompetitors(
  projectId: string,
): Promise<CompetitorComparison> {
  await assertProjectExists(projectId);
  return buildCompetitorComparison(projectId);
}

export async function createCompetitor(
  projectId: string,
  _prevState: CompetitorActionState,
  formData: FormData,
): Promise<CompetitorActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormCompetitor(raw);
    const input = parseWithSchema(createCompetitorSchema, parsed);

    const repo = getCompetitorRepository();
    const competitor = await repo.create({
      projectId,
      ...input,
    });

    revalidatePath(competitorPaths(projectId).list);
    revalidatePath(competitorPaths(projectId).compare);
    revalidatePath(`/projects/${projectId}`);
    redirect(competitorPaths(projectId, competitor.id).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateCompetitor(
  projectId: string,
  competitorId: string,
  _prevState: CompetitorActionState,
  formData: FormData,
): Promise<CompetitorActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormCompetitor(raw);
    const input = parseWithSchema(updateCompetitorSchema, parsed);

    const repo = getCompetitorRepository();
    const existing = await getCompetitor(projectId, competitorId);
    if (!existing) {
      throw new NotFoundError(`Competitor not found: ${competitorId}`);
    }

    await repo.update(competitorId, input);

    revalidatePath(competitorPaths(projectId).list);
    revalidatePath(competitorPaths(projectId).compare);
    revalidatePath(competitorPaths(projectId, competitorId).detail);
    redirect(competitorPaths(projectId, competitorId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteCompetitor(
  projectId: string,
  competitorId: string,
): Promise<void> {
  assertDbConfigured();

  const repo = getCompetitorRepository();
  const existing = await getCompetitor(projectId, competitorId);
  if (!existing) {
    throw new NotFoundError(`Competitor not found: ${competitorId}`);
  }

  await repo.delete(competitorId);
  revalidatePath(competitorPaths(projectId).list);
  revalidatePath(competitorPaths(projectId).compare);
  revalidatePath(`/projects/${projectId}`);
  redirect(competitorPaths(projectId).list);
}
