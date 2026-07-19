'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { generateDevelopmentSpecFromContext } from '@repo/ai/validation';
import { BaseError, InternalServerError, NotFoundError, ValidationError } from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import { isSupabaseConfigured } from '@repo/db';
import type { DevelopmentSpec, DevelopmentSpecWithSections } from '@repo/types/validation';

import { findPRDWithSections } from '@/features/prd/services/prd-service';
import { listPRDs } from '@/features/prd/services/prd-service';
import { findStartupProject } from '@/features/projects/services/project-service';
import {
  getDevelopmentSpecRepository,
  getDevelopmentSpecSectionRepository,
} from '@/lib/db/platform';

import {
  createDevelopmentSpecSchema,
  formDataToObject,
  updateDevelopmentSpecSectionSchema,
} from '../schemas/development-spec-schema';
import { collectDevelopmentSpecContext } from '../services/context-collector';
import {
  findDevelopmentSpecSectionById,
  findDevelopmentSpecWithSections,
  listDevelopmentSpecs,
} from '../services/development-spec-service';
import { DEFAULT_DEVELOPMENT_SPEC_SECTIONS } from '../utils/default-sections';

export type DevelopmentSpecActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  saved?: boolean;
  success?: boolean;
  specId?: string;
  usedMock?: boolean;
};

function mapValidationError(error: ValidationError): DevelopmentSpecActionState {
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

function specPaths(projectId: string, specId?: string) {
  const base = `/projects/${projectId}/development-spec`;
  return {
    list: base,
    detail: specId ? `${base}/${specId}` : base,
    preview: specId ? `${base}/${specId}/preview` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

async function assertSpecBelongsToProject(
  projectId: string,
  specId: string,
): Promise<DevelopmentSpec> {
  const spec = await findDevelopmentSpecWithSections(projectId, specId);
  if (!spec) {
    throw new NotFoundError(`Development spec not found: ${specId}`);
  }
  return spec;
}

function revalidateSpecPaths(projectId: string, specId: string): void {
  const paths = specPaths(projectId, specId);
  revalidatePath(paths.list);
  revalidatePath(paths.detail);
  revalidatePath(paths.preview);
  revalidatePath(`/projects/${projectId}`);
}

function mapError(error: unknown): string {
  if (error instanceof BaseError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Development spec generation failed';
}

async function resolvePRDId(projectId: string, prdId?: string): Promise<string | null> {
  if (prdId) {
    const prd = await findPRDWithSections(projectId, prdId);
    return prd ? prd.id : null;
  }
  const prds = await listPRDs(projectId);
  return prds[0]?.id ?? null;
}

async function applyAIOutputToSpec(
  projectId: string,
  specId: string,
  spec: DevelopmentSpecWithSections,
  output: Awaited<ReturnType<typeof generateDevelopmentSpecFromContext>>['output'],
): Promise<void> {
  const specRepo = getDevelopmentSpecRepository();
  const sectionRepo = getDevelopmentSpecSectionRepository();

  const overview = output.sections.find((s) => s.type === 'SYSTEM_OVERVIEW');

  await specRepo.update(specId, {
    title: output.title,
    summary: overview?.content.slice(0, 500) ?? spec.summary,
    status: 'COMPLETED',
  });

  const sectionByType = new Map(spec.sections.map((s) => [s.sectionType, s]));

  for (const aiSection of output.sections) {
    const existing = sectionByType.get(aiSection.type);
    if (existing) {
      await sectionRepo.update(existing.id, {
        title: aiSection.title,
        content: aiSection.content,
      });
    }
  }

  revalidateSpecPaths(projectId, specId);
}

export async function getDevelopmentSpecList(projectId: string) {
  return listDevelopmentSpecs(projectId);
}

export async function getDevelopmentSpec(
  projectId: string,
  specId: string,
): Promise<DevelopmentSpecWithSections | null> {
  return findDevelopmentSpecWithSections(projectId, specId);
}

export async function createDevelopmentSpec(
  projectId: string,
  _prevState: DevelopmentSpecActionState,
  formData: FormData,
): Promise<DevelopmentSpecActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(createDevelopmentSpecSchema, {
      title: raw.title,
      prdId: raw.prdId,
    });

    const prd = await findPRDWithSections(projectId, parsed.prdId);
    if (!prd) {
      return { error: 'Selected PRD not found' };
    }

    const specRepo = getDevelopmentSpecRepository();
    const sectionRepo = getDevelopmentSpecSectionRepository();

    const spec = await specRepo.create({
      projectId,
      prdId: parsed.prdId,
      title: parsed.title,
      status: 'DRAFT',
    });

    await sectionRepo.createMany(
      DEFAULT_DEVELOPMENT_SPEC_SECTIONS.map((section) => ({
        developmentSpecId: spec.id,
        sectionType: section.sectionType,
        title: section.title,
        content: '',
        order: section.order,
      })),
    );

    const paths = specPaths(projectId, spec.id);
    revalidatePath(paths.list);
    redirect(paths.detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateDevelopmentSection(
  projectId: string,
  specId: string,
  sectionId: string,
  _prevState: DevelopmentSpecActionState,
  formData: FormData,
): Promise<DevelopmentSpecActionState> {
  try {
    assertDbConfigured();
    await assertSpecBelongsToProject(projectId, specId);

    const existing = await findDevelopmentSpecSectionById(sectionId);
    if (!existing || existing.developmentSpecId !== specId) {
      throw new NotFoundError(`Section not found: ${sectionId}`);
    }

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updateDevelopmentSpecSectionSchema, {
      title: raw.title,
      content: raw.content ?? '',
    });

    const repo = getDevelopmentSpecSectionRepository();
    await repo.update(sectionId, parsed);

    revalidateSpecPaths(projectId, specId);
    return { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function generateDevelopmentSpec(
  projectId: string,
  specId?: string,
  prdId?: string,
): Promise<DevelopmentSpecActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  try {
    await assertProjectExists(projectId);

    const activePRDId = await resolvePRDId(projectId, prdId);
    if (!activePRDId) {
      return { error: 'No PRD found. Create a PRD before generating a development spec.' };
    }

    const context = await collectDevelopmentSpecContext(projectId, activePRDId);
    if (!context) {
      return { error: 'Project not found' };
    }

    const specRepo = getDevelopmentSpecRepository();
    const sectionRepo = getDevelopmentSpecSectionRepository();

    let spec: DevelopmentSpecWithSections;
    let activeSpecId = specId;

    if (activeSpecId) {
      const existing = await findDevelopmentSpecWithSections(projectId, activeSpecId);
      if (!existing) return { error: 'Development spec not found' };
      spec = existing;
      await specRepo.update(activeSpecId, { status: 'GENERATING' });
    } else {
      const defaultTitle = `${context.project.title} Development Specification`;
      const created = await specRepo.create({
        projectId,
        prdId: activePRDId,
        title: defaultTitle,
        status: 'GENERATING',
      });
      const sections = await sectionRepo.createMany(
        DEFAULT_DEVELOPMENT_SPEC_SECTIONS.map((section) => ({
          developmentSpecId: created.id,
          sectionType: section.sectionType,
          title: section.title,
          content: '',
          order: section.order,
        })),
      );
      spec = { ...created, sections };
      activeSpecId = created.id;
    }

    revalidateSpecPaths(projectId, activeSpecId);

    const result = await generateDevelopmentSpecFromContext(context);
    await applyAIOutputToSpec(projectId, activeSpecId, spec, result.output);

    return {
      success: true,
      specId: activeSpecId,
      usedMock: result.usedMock,
    };
  } catch (error) {
    if (specId) {
      try {
        const specRepo = getDevelopmentSpecRepository();
        await specRepo.update(specId, { status: 'DRAFT' });
        revalidateSpecPaths(projectId, specId);
      } catch {
        // ignore cleanup failure
      }
    }
    return { error: mapError(error) };
  }
}

export async function deleteDevelopmentSpec(
  projectId: string,
  specId: string,
): Promise<void> {
  assertDbConfigured();
  await assertSpecBelongsToProject(projectId, specId);

  const repo = getDevelopmentSpecRepository();
  await repo.delete(specId);

  revalidatePath(specPaths(projectId).list);
  redirect(specPaths(projectId).list);
}
