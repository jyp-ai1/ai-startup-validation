'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { generatePRDFromContext } from '@repo/ai/validation';
import { BaseError, InternalServerError, NotFoundError, ValidationError } from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { PRD, PRDWithSections } from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import { getPRDRepository, getPRDSectionRepository } from '@/lib/db/platform';

import {
  createPRDSchema,
  formDataToObject,
  updatePRDSectionSchema,
} from '../schemas/prd-schema';
import { collectPRDContext } from '../services/context-collector';
import {
  findPRDSectionById,
  findPRDWithSections,
  listPRDs,
} from '../services/prd-service';
import { DEFAULT_PRD_SECTIONS } from '../utils/default-sections';

export type PRDActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  saved?: boolean;
  success?: boolean;
  prdId?: string;
  usedMock?: boolean;
};

function mapValidationError(error: ValidationError): PRDActionState {
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

function prdPaths(projectId: string, prdId?: string) {
  const base = `/projects/${projectId}/prd`;
  return {
    list: base,
    detail: prdId ? `${base}/${prdId}` : base,
    preview: prdId ? `${base}/${prdId}/preview` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

async function assertPRDBelongsToProject(
  projectId: string,
  prdId: string,
): Promise<PRD> {
  const prd = await findPRDWithSections(projectId, prdId);
  if (!prd) {
    throw new NotFoundError(`PRD not found: ${prdId}`);
  }
  return prd;
}

function revalidatePRDPaths(projectId: string, prdId: string): void {
  const paths = prdPaths(projectId, prdId);
  revalidatePath(paths.list);
  revalidatePath(paths.detail);
  revalidatePath(paths.preview);
  revalidatePath(`/projects/${projectId}`);
}

function mapError(error: unknown): string {
  if (error instanceof BaseError) return error.message;
  if (error instanceof Error) return error.message;
  return 'PRD generation failed';
}

async function applyAIOutputToPRD(
  projectId: string,
  prdId: string,
  prd: PRDWithSections,
  output: Awaited<ReturnType<typeof generatePRDFromContext>>['output'],
): Promise<void> {
  const prdRepo = getPRDRepository();
  const sectionRepo = getPRDSectionRepository();

  const overview = output.sections.find((s) => s.type === 'PRODUCT_OVERVIEW');

  await prdRepo.update(prdId, {
    title: output.title,
    summary: overview?.content.slice(0, 500) ?? prd.summary,
    status: 'COMPLETED',
  });

  const sectionByType = new Map(prd.sections.map((s) => [s.sectionType, s]));

  for (const aiSection of output.sections) {
    const existing = sectionByType.get(aiSection.type);
    if (existing) {
      await sectionRepo.update(existing.id, {
        title: aiSection.title,
        content: aiSection.content,
      });
    }
  }

  revalidatePRDPaths(projectId, prdId);
}

export async function getPRDList(projectId: string) {
  return listPRDs(projectId);
}

export async function getPRD(
  projectId: string,
  prdId: string,
): Promise<PRDWithSections | null> {
  return findPRDWithSections(projectId, prdId);
}

export async function createPRD(
  projectId: string,
  _prevState: PRDActionState,
  formData: FormData,
): Promise<PRDActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(createPRDSchema, { title: raw.title });

    const prdRepo = getPRDRepository();
    const sectionRepo = getPRDSectionRepository();

    const prd = await prdRepo.create({
      projectId,
      title: parsed.title,
      status: 'DRAFT',
    });

    await sectionRepo.createMany(
      DEFAULT_PRD_SECTIONS.map((section) => ({
        prdId: prd.id,
        sectionType: section.sectionType,
        title: section.title,
        content: '',
        order: section.order,
      })),
    );

    const paths = prdPaths(projectId, prd.id);
    revalidatePath(paths.list);
    redirect(paths.detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updatePRDSection(
  projectId: string,
  prdId: string,
  sectionId: string,
  _prevState: PRDActionState,
  formData: FormData,
): Promise<PRDActionState> {
  try {
    assertDbConfigured();
    await assertPRDBelongsToProject(projectId, prdId);

    const existing = await findPRDSectionById(sectionId);
    if (!existing || existing.prdId !== prdId) {
      throw new NotFoundError(`Section not found: ${sectionId}`);
    }

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updatePRDSectionSchema, {
      title: raw.title,
      content: raw.content ?? '',
    });

    const repo = getPRDSectionRepository();
    await repo.update(sectionId, parsed);

    revalidatePRDPaths(projectId, prdId);
    return { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function deletePRDSection(
  projectId: string,
  prdId: string,
  sectionId: string,
): Promise<PRDActionState> {
  try {
    assertDbConfigured();
    await assertPRDBelongsToProject(projectId, prdId);

    const existing = await findPRDSectionById(sectionId);
    if (!existing || existing.prdId !== prdId) {
      throw new NotFoundError(`Section not found: ${sectionId}`);
    }

    const repo = getPRDSectionRepository();
    await repo.delete(sectionId);

    revalidatePRDPaths(projectId, prdId);
    return { success: true };
  } catch (error) {
    if (error instanceof BaseError) {
      return { error: error.message };
    }
    return { error: 'Failed to delete section' };
  }
}

export async function generatePRD(
  projectId: string,
  prdId?: string,
): Promise<PRDActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  try {
    await assertProjectExists(projectId);
    const context = await collectPRDContext(projectId);
    if (!context) {
      return { error: 'Project not found' };
    }

    const prdRepo = getPRDRepository();
    const sectionRepo = getPRDSectionRepository();

    let prd: PRDWithSections;
    let activePRDId = prdId;

    if (activePRDId) {
      const existing = await findPRDWithSections(projectId, activePRDId);
      if (!existing) return { error: 'PRD not found' };
      prd = existing;
      await prdRepo.update(activePRDId, { status: 'GENERATING' });
    } else {
      const defaultTitle = `${context.project.title} PRD`;
      const created = await prdRepo.create({
        projectId,
        title: defaultTitle,
        status: 'GENERATING',
      });
      const sections = await sectionRepo.createMany(
        DEFAULT_PRD_SECTIONS.map((section) => ({
          prdId: created.id,
          sectionType: section.sectionType,
          title: section.title,
          content: '',
          order: section.order,
        })),
      );
      prd = { ...created, sections };
      activePRDId = created.id;
    }

    revalidatePRDPaths(projectId, activePRDId);

    const result = await generatePRDFromContext(context);
    await applyAIOutputToPRD(projectId, activePRDId, prd, result.output);

    return {
      success: true,
      prdId: activePRDId,
      usedMock: result.usedMock,
    };
  } catch (error) {
    if (prdId) {
      try {
        const prdRepo = getPRDRepository();
        await prdRepo.update(prdId, { status: 'DRAFT' });
        revalidatePRDPaths(projectId, prdId);
      } catch {
        // ignore cleanup failure
      }
    }
    return { error: mapError(error) };
  }
}

export async function deletePRD(projectId: string, prdId: string): Promise<void> {
  assertDbConfigured();
  await assertPRDBelongsToProject(projectId, prdId);

  const repo = getPRDRepository();
  await repo.delete(prdId);

  revalidatePath(prdPaths(projectId).list);
  redirect(prdPaths(projectId).list);
}
