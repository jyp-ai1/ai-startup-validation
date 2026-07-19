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
  Evidence,
  EvidenceListFilter,
} from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getEvidenceRepository } from '@/lib/db/platform';

import {
  createEvidenceSchema,
  formDataToObject,
  updateEvidenceSchema,
} from '../schemas/evidence-schema';
import { findEvidence, listEvidence } from '../services/evidence-service';

export type EvidenceActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): EvidenceActionState {
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

function evidencePaths(projectId: string, evidenceId?: string) {
  const base = `/projects/${projectId}/evidence`;
  return {
    list: base,
    detail: evidenceId ? `${base}/${evidenceId}` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

function parseOptionalId(value: string | undefined | null): string | null {
  if (!value || value === 'NONE') return null;
  return value;
}

function parseOptionalSourceType(
  value: string | undefined | null,
): string | null {
  if (!value || value === 'NONE') return null;
  return value;
}

function parseFormEvidence(raw: Record<string, string>) {
  return {
    title: raw.title,
    category: raw.category,
    summary: raw.summary,
    researchId: parseOptionalId(raw.researchId),
    sourceType: parseOptionalSourceType(raw.sourceType),
    sourceName: emptyToNull(raw.sourceName),
    sourceUrl: emptyToNull(raw.sourceUrl),
    content: emptyToNull(raw.content),
    confidence: raw.confidence || undefined,
    publishedDate: emptyToNull(raw.publishedDate),
  };
}

export async function getEvidenceList(
  projectId: string,
  filter?: EvidenceListFilter,
): Promise<Evidence[]> {
  return listEvidence(projectId, filter);
}

export async function getEvidenceDetail(
  projectId: string,
  evidenceId: string,
): Promise<Evidence | null> {
  const evidence = await findEvidence(evidenceId);
  if (!evidence || evidence.projectId !== projectId) {
    return null;
  }
  return evidence;
}

export async function createEvidence(
  projectId: string,
  _prevState: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormEvidence(raw);
    const input = parseWithSchema(createEvidenceSchema, parsed);

    const repo = getEvidenceRepository();
    const evidence = await repo.create({
      projectId,
      title: input.title,
      category: input.category,
      summary: input.summary,
      researchId: input.researchId ?? null,
      sourceType: input.sourceType ?? null,
      sourceName: input.sourceName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      content: input.content ?? null,
      confidence: input.confidence,
      publishedDate: input.publishedDate ?? null,
    });

    revalidatePath(evidencePaths(projectId).list);
    revalidatePath(`/projects/${projectId}`);
    redirect(evidencePaths(projectId, evidence.id).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateEvidence(
  projectId: string,
  evidenceId: string,
  _prevState: EvidenceActionState,
  formData: FormData,
): Promise<EvidenceActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormEvidence(raw);
    const input = parseWithSchema(updateEvidenceSchema, parsed);

    const repo = getEvidenceRepository();
    const existing = await getEvidenceDetail(projectId, evidenceId);
    if (!existing) {
      throw new NotFoundError(`Evidence not found: ${evidenceId}`);
    }

    await repo.update(evidenceId, {
      title: input.title,
      category: input.category,
      summary: input.summary,
      researchId: input.researchId ?? null,
      sourceType: input.sourceType ?? null,
      sourceName: input.sourceName ?? null,
      sourceUrl: input.sourceUrl ?? null,
      content: input.content ?? null,
      confidence: input.confidence,
      publishedDate: input.publishedDate ?? null,
    });

    revalidatePath(evidencePaths(projectId).list);
    revalidatePath(evidencePaths(projectId, evidenceId).detail);
    redirect(evidencePaths(projectId, evidenceId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteEvidence(
  projectId: string,
  evidenceId: string,
): Promise<void> {
  assertDbConfigured();

  const repo = getEvidenceRepository();
  const existing = await getEvidenceDetail(projectId, evidenceId);
  if (!existing) {
    throw new NotFoundError(`Evidence not found: ${evidenceId}`);
  }

  await repo.delete(evidenceId);
  revalidatePath(evidencePaths(projectId).list);
  revalidatePath(`/projects/${projectId}`);
  redirect(evidencePaths(projectId).list);
}
