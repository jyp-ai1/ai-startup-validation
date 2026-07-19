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
import type { VOC, VOCListFilter, VOCSummary } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getVOCRepository } from '@/lib/db/platform';

import {
  createVOCSchema,
  formDataToObject,
  updateVOCSchema,
} from '../schemas/voc-schema';
import {
  buildVOCSummary,
  findVOCEntry,
  listVOCEntries,
} from '../services/voc-service';

export type VOCActionState = {
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

function mapValidationError(error: ValidationError): VOCActionState {
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

function vocPaths(projectId: string, vocId?: string) {
  const base = `/projects/${projectId}/voc`;
  return {
    list: base,
    summary: `${base}/summary`,
    detail: vocId ? `${base}/${vocId}` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

function parseFormVOC(raw: Record<string, string>) {
  return {
    title: raw.title,
    content: raw.content,
    painPoint: raw.painPoint,
    sourceType: parseOptionalEnum(raw.sourceType),
    customerSegment: parseOptionalEnum(raw.customerSegment),
    emotion: parseOptionalEnum(raw.emotion),
    frequency: parseOptionalEnum(raw.frequency),
    severity: parseOptionalEnum(raw.severity),
    willingnessToPay: raw.willingnessToPay || 'UNKNOWN',
  };
}

export async function getVOCList(
  projectId: string,
  filter?: VOCListFilter,
): Promise<VOC[]> {
  return listVOCEntries(projectId, filter);
}

export async function getVOCDetail(
  projectId: string,
  vocId: string,
): Promise<VOC | null> {
  const entry = await findVOCEntry(vocId);
  if (!entry || entry.projectId !== projectId) {
    return null;
  }
  return entry;
}

export async function getVOCSummary(projectId: string): Promise<VOCSummary> {
  await assertProjectExists(projectId);
  return buildVOCSummary(projectId);
}

export async function createVOC(
  projectId: string,
  _prevState: VOCActionState,
  formData: FormData,
): Promise<VOCActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormVOC(raw);
    const input = parseWithSchema(createVOCSchema, parsed);

    const repo = getVOCRepository();
    const entry = await repo.create({
      projectId,
      ...input,
    });

    revalidatePath(vocPaths(projectId).list);
    revalidatePath(vocPaths(projectId).summary);
    revalidatePath(`/projects/${projectId}`);
    redirect(vocPaths(projectId, entry.id).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateVOC(
  projectId: string,
  vocId: string,
  _prevState: VOCActionState,
  formData: FormData,
): Promise<VOCActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseFormVOC(raw);
    const input = parseWithSchema(updateVOCSchema, parsed);

    const repo = getVOCRepository();
    const existing = await getVOCDetail(projectId, vocId);
    if (!existing) {
      throw new NotFoundError(`VOC not found: ${vocId}`);
    }

    await repo.update(vocId, input);

    revalidatePath(vocPaths(projectId).list);
    revalidatePath(vocPaths(projectId).summary);
    revalidatePath(vocPaths(projectId, vocId).detail);
    redirect(vocPaths(projectId, vocId).detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deleteVOC(projectId: string, vocId: string): Promise<void> {
  assertDbConfigured();

  const repo = getVOCRepository();
  const existing = await getVOCDetail(projectId, vocId);
  if (!existing) {
    throw new NotFoundError(`VOC not found: ${vocId}`);
  }

  await repo.delete(vocId);
  revalidatePath(vocPaths(projectId).list);
  revalidatePath(vocPaths(projectId).summary);
  revalidatePath(`/projects/${projectId}`);
  redirect(vocPaths(projectId).list);
}
