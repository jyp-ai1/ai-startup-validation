'use server';

import { revalidatePath } from 'next/cache';

import { InternalServerError } from '@repo/core/errors';
import { isSupabaseConfigured } from '@repo/db';

import { startOrchestratorPlan } from '@/features/agents/orchestrator/actions/orchestrator-actions';
import { findStartupProject } from '@/features/projects/services/project-service';
import { getResearchPlanRepository, getStartupProjectRepository } from '@/lib/db/platform';

import {
  getOnboardingFromMemory,
  saveOnboardingToMemory,
} from '../repositories/onboarding-store';
import {
  buildOnboardingSummary,
  buildResearchPlanItems,
  getResearchPlanCopy,
  parseOnboardingContext,
} from '../services/onboarding-service';
import type { OnboardingAnswers, OnboardingContext } from '../types';

export type OnboardingActionState = {
  error?: string;
  success?: boolean;
  planId?: string;
};

export async function getProjectOnboardingContext(
  projectId: string,
): Promise<OnboardingContext | null> {
  if (isSupabaseConfigured()) {
    try {
      const project = await findStartupProject(projectId);
      const parsed = parseOnboardingContext(project?.onboardingContext);
      if (parsed) return parsed;
    } catch {
      /* column may not exist yet */
    }
  }

  return getOnboardingFromMemory(projectId);
}

async function persistOnboardingContext(
  projectId: string,
  context: OnboardingContext,
): Promise<void> {
  await saveOnboardingToMemory(projectId, context);

  if (!isSupabaseConfigured()) return;

  try {
    const repo = getStartupProjectRepository();
    await repo.update(projectId, {
      onboardingContext: context as unknown as Record<string, unknown>,
      targetCustomer: context.answers.targetCustomer,
      summary: context.answers.validation,
      status: 'RESEARCHING',
    });
  } catch {
    /* migration 017 may not be applied */
  }
}

export async function completeOnboardingInterview(
  projectId: string,
  answers: OnboardingAnswers,
): Promise<OnboardingActionState> {
  try {
    const project = await findStartupProject(projectId);
    if (!project) return { error: 'Project not found' };

    const summary = buildOnboardingSummary(answers);
    const context: OnboardingContext = {
      status: 'completed',
      answers,
      summary,
      completedAt: new Date().toISOString(),
    };

    const planItems = buildResearchPlanItems(answers);

    if (isSupabaseConfigured()) {
      const researchRepo = getResearchPlanRepository();
      for (const item of planItems) {
        try {
          const copy = getResearchPlanCopy(item.id);
          await researchRepo.create({
            projectId,
            title: copy.title,
            description: copy.description,
            researchType: item.researchType,
            priority: item.priority,
          });
        } catch {
          /* skip duplicate or schema issues */
        }
      }
    }

    await persistOnboardingContext(projectId, context);

    revalidatePath('/dashboard');
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/research`);

    return { success: true };
  } catch {
    return { error: 'Failed to complete onboarding interview' };
  }
}

export async function startOnboardingResearch(
  projectId: string,
): Promise<OnboardingActionState> {
  try {
    const project = await findStartupProject(projectId);
    if (!project) return { error: 'Project not found' };

    if (!isSupabaseConfigured()) {
      throw new InternalServerError('Database is not configured.');
    }

    const result = await startOrchestratorPlan(projectId);
    if (result.error) return { error: result.error };

    revalidatePath('/dashboard');
    revalidatePath(`/projects/${projectId}`);

    return { success: true, planId: result.planId };
  } catch {
    return { error: 'Failed to start AI research' };
  }
}
