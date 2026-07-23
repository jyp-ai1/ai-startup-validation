'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { InternalServerError, ValidationError } from '@repo/core/errors';
import { isSupabaseConfigured } from '@repo/db';
import {
  PROJECT_GOALS,
  PROJECT_TYPES,
  type ProjectGoal,
  type ProjectType,
} from '@repo/types/validation';

import { getServerAuthUser } from '@/lib/auth/server-auth';
import { getStartupProjectRepository } from '@/lib/db/platform';

export type WizardActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

type WizardInput = {
  projectType: ProjectType;
  title: string;
  industry: string;
  country: string;
  summary: string;
  targetCustomer: string;
  projectGoal: ProjectGoal;
};

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  const normalized = String(value ?? '').trim();
  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

function parseWizardInput(formData: FormData): WizardInput {
  const fieldErrors: Record<string, string[]> = {};

  const projectType = parseEnum(formData.get('projectType'), PROJECT_TYPES);
  if (!projectType) fieldErrors.projectType = ['activation.wizard.errors.projectTypeRequired'];

  const title = String(formData.get('title') ?? '').trim();
  if (!title) fieldErrors.title = ['activation.wizard.errors.titleRequired'];

  const industry = String(formData.get('industry') ?? '').trim();
  if (!industry) fieldErrors.industry = ['activation.wizard.errors.industryRequired'];

  const country = String(formData.get('country') ?? '').trim();
  if (!country) fieldErrors.country = ['activation.wizard.errors.countryRequired'];

  const summary = String(formData.get('summary') ?? '').trim();
  if (!summary) fieldErrors.summary = ['activation.wizard.errors.descriptionRequired'];

  const targetCustomer = String(formData.get('targetCustomer') ?? '').trim();
  if (!targetCustomer) fieldErrors.targetCustomer = ['activation.wizard.errors.targetRequired'];

  const projectGoal = parseEnum(formData.get('projectGoal'), PROJECT_GOALS);
  if (!projectGoal) fieldErrors.projectGoal = ['activation.wizard.errors.goalRequired'];

  if (Object.keys(fieldErrors).length > 0) {
    throw new ValidationError('Validation failed', fieldErrors);
  }

  return {
    projectType: projectType!,
    title,
    industry,
    country,
    summary,
    targetCustomer,
    projectGoal: projectGoal!,
  };
}

export async function createProjectFromWizard(
  _prev: WizardActionState,
  formData: FormData,
): Promise<WizardActionState> {
  try {
    if (!isSupabaseConfigured()) {
      throw new InternalServerError('Database is not configured.');
    }

    const user = await getServerAuthUser();
    if (!user) {
      redirect('/auth/login?next=/dashboard');
    }

    const input = parseWizardInput(formData);

    const repo = getStartupProjectRepository();
    const project = await repo.create({
      title: input.title,
      summary: input.summary,
      industry: input.industry,
      country: input.country,
      targetCustomer: input.targetCustomer,
      projectType: input.projectType,
      projectGoal: input.projectGoal,
      userId: user.id,
      isDemo: false,
      status: 'DRAFT',
    });

    const cookieStore = await cookies();
    cookieStore.delete('WORKSPACE_MODE');
    cookieStore.set('ACTIVE_PROJECT_ID', project.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });

    revalidatePath('/dashboard');
    revalidatePath('/projects');
    redirect(`/dashboard?project=${project.id}&onboarding=1`);
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        error: error.message,
        fieldErrors: error.details as Record<string, string[]> | undefined,
      };
    }
    if (error instanceof InternalServerError) {
      return { error: error.message };
    }
    throw error;
  }
}
