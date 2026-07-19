'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  InternalServerError,
  NotFoundError,
  ValidationError,
} from '@repo/core/errors';
import { parseWithSchema } from '@repo/core/validation';
import {
  generateBusinessPlanFromContext,
} from '@repo/ai/validation';
import { BaseError } from '@repo/core/errors';
import { isSupabaseConfigured } from '@repo/db';
import type {
  BusinessPlan,
  BusinessPlanWithSections,
} from '@repo/types/validation';

import { findStartupProject } from '@/features/projects/services/project-service';
import {
  getBusinessPlanRepository,
  getBusinessPlanSectionRepository,
} from '@/lib/db/platform';

import {
  createBusinessPlanSchema,
  formDataToObject,
  updateBusinessPlanSectionSchema,
} from '../schemas/business-plan-schema';
import { collectBusinessPlanContext } from '../services/context-collector';
import {
  findBusinessPlanSectionById,
  findBusinessPlanWithSections,
  listBusinessPlans,
} from '../services/business-plan-service';
import { DEFAULT_BUSINESS_PLAN_SECTIONS } from '../utils/default-sections';

export type BusinessPlanActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  saved?: boolean;
  success?: boolean;
  planId?: string;
  usedMock?: boolean;
};

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapValidationError(error: ValidationError): BusinessPlanActionState {
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

function planPaths(projectId: string, planId?: string) {
  const base = `/projects/${projectId}/business-plan`;
  return {
    list: base,
    detail: planId ? `${base}/${planId}` : base,
    preview: planId ? `${base}/${planId}/preview` : base,
  };
}

async function assertProjectExists(projectId: string): Promise<void> {
  const project = await findStartupProject(projectId);
  if (!project) {
    throw new NotFoundError(`Startup project not found: ${projectId}`);
  }
}

async function assertPlanBelongsToProject(
  projectId: string,
  planId: string,
): Promise<BusinessPlan> {
  const plan = await findBusinessPlanWithSections(projectId, planId);
  if (!plan) {
    throw new NotFoundError(`Business plan not found: ${planId}`);
  }
  return plan;
}

function revalidatePlanPaths(projectId: string, planId: string): void {
  const paths = planPaths(projectId, planId);
  revalidatePath(paths.list);
  revalidatePath(paths.detail);
  revalidatePath(paths.preview);
  revalidatePath(`/projects/${projectId}`);
}

function mapError(error: unknown): string {
  if (error instanceof BaseError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Business plan generation failed';
}

async function applyAIOutputToPlan(
  projectId: string,
  planId: string,
  plan: BusinessPlanWithSections,
  output: Awaited<ReturnType<typeof generateBusinessPlanFromContext>>['output'],
): Promise<void> {
  const planRepo = getBusinessPlanRepository();
  const sectionRepo = getBusinessPlanSectionRepository();

  const overview = output.sections.find((s) => s.type === 'OVERVIEW');

  await planRepo.update(planId, {
    title: output.title,
    summary: overview?.content.slice(0, 500) ?? plan.summary,
    status: 'COMPLETED',
  });

  const sectionByType = new Map(plan.sections.map((s) => [s.sectionType, s]));

  for (const aiSection of output.sections) {
    const existing = sectionByType.get(aiSection.type);
    if (existing) {
      await sectionRepo.update(existing.id, {
        title: aiSection.title,
        content: aiSection.content,
      });
    }
  }

  revalidatePlanPaths(projectId, planId);
}

export async function getBusinessPlanList(
  projectId: string,
): Promise<BusinessPlan[]> {
  return listBusinessPlans(projectId);
}

export async function getBusinessPlan(
  projectId: string,
  planId: string,
): Promise<BusinessPlanWithSections | null> {
  return findBusinessPlanWithSections(projectId, planId);
}

export async function createBusinessPlan(
  projectId: string,
  _prevState: BusinessPlanActionState,
  formData: FormData,
): Promise<BusinessPlanActionState> {
  try {
    assertDbConfigured();
    await assertProjectExists(projectId);

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(createBusinessPlanSchema, { title: raw.title });

    const planRepo = getBusinessPlanRepository();
    const sectionRepo = getBusinessPlanSectionRepository();

    const plan = await planRepo.create({
      projectId,
      title: parsed.title,
      status: 'DRAFT',
    });

    await sectionRepo.createMany(
      DEFAULT_BUSINESS_PLAN_SECTIONS.map((section) => ({
        businessPlanId: plan.id,
        sectionType: section.sectionType,
        title: section.title,
        content: '',
        order: section.order,
      })),
    );

    const paths = planPaths(projectId, plan.id);
    revalidatePath(paths.list);
    redirect(paths.detail);
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function updateBusinessPlanSection(
  projectId: string,
  planId: string,
  sectionId: string,
  _prevState: BusinessPlanActionState,
  formData: FormData,
): Promise<BusinessPlanActionState> {
  try {
    assertDbConfigured();
    await assertPlanBelongsToProject(projectId, planId);

    const existing = await findBusinessPlanSectionById(sectionId);
    if (!existing || existing.businessPlanId !== planId) {
      throw new NotFoundError(`Section not found: ${sectionId}`);
    }

    const raw = formDataToObject(formData);
    const parsed = parseWithSchema(updateBusinessPlanSectionSchema, {
      title: raw.title,
      content: raw.content ?? '',
    });

    const repo = getBusinessPlanSectionRepository();
    await repo.update(sectionId, parsed);

    revalidatePlanPaths(projectId, planId);
    return { saved: true };
  } catch (error) {
    if (error instanceof ValidationError) {
      return mapValidationError(error);
    }
    throw error;
  }
}

export async function generateBusinessPlan(
  projectId: string,
  planId?: string,
): Promise<BusinessPlanActionState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  try {
    await assertProjectExists(projectId);
    const context = await collectBusinessPlanContext(projectId);
    if (!context) {
      return { error: 'Project not found' };
    }

    const planRepo = getBusinessPlanRepository();
    const sectionRepo = getBusinessPlanSectionRepository();

    let plan: BusinessPlanWithSections;
    let activePlanId = planId;

    if (activePlanId) {
      const existing = await findBusinessPlanWithSections(projectId, activePlanId);
      if (!existing) return { error: 'Business plan not found' };
      plan = existing;
      await planRepo.update(activePlanId, { status: 'GENERATING' });
    } else {
      const defaultTitle = `${context.project.title} 사업계획서`;
      const created = await planRepo.create({
        projectId,
        title: defaultTitle,
        status: 'GENERATING',
      });
      const sections = await sectionRepo.createMany(
        DEFAULT_BUSINESS_PLAN_SECTIONS.map((section) => ({
          businessPlanId: created.id,
          sectionType: section.sectionType,
          title: section.title,
          content: '',
          order: section.order,
        })),
      );
      plan = { ...created, sections };
      activePlanId = created.id;
    }

    revalidatePlanPaths(projectId, activePlanId);

    const result = await generateBusinessPlanFromContext(context);
    await applyAIOutputToPlan(projectId, activePlanId, plan, result.output);

    return {
      success: true,
      planId: activePlanId,
      usedMock: result.usedMock,
    };
  } catch (error) {
    if (planId) {
      try {
        const planRepo = getBusinessPlanRepository();
        await planRepo.update(planId, { status: 'DRAFT' });
        revalidatePlanPaths(projectId, planId);
      } catch {
        // ignore cleanup failure
      }
    }
    return { error: mapError(error) };
  }
}

export async function deleteBusinessPlan(
  projectId: string,
  planId: string,
): Promise<void> {
  assertDbConfigured();
  await assertPlanBelongsToProject(projectId, planId);

  const repo = getBusinessPlanRepository();
  await repo.delete(planId);

  revalidatePath(planPaths(projectId).list);
  redirect(planPaths(projectId).list);
}
