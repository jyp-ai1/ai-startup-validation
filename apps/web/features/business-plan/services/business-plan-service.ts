import { isSupabaseConfigured } from '@repo/db';
import type {
  BusinessPlan,
  BusinessPlanSection,
  BusinessPlanWithSections,
} from '@repo/types/validation';

import {
  getBusinessPlanRepository,
  getBusinessPlanSectionRepository,
} from '@/lib/db/platform';

export async function listBusinessPlans(projectId: string): Promise<BusinessPlan[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getBusinessPlanRepository();
  return repo.findByProjectId(projectId);
}

export async function findBusinessPlan(planId: string): Promise<BusinessPlan | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getBusinessPlanRepository();
  return repo.findById(planId);
}

export async function findBusinessPlanSections(
  planId: string,
): Promise<BusinessPlanSection[]> {
  if (!isSupabaseConfigured()) return [];
  const repo = getBusinessPlanSectionRepository();
  return repo.findByBusinessPlanId(planId);
}

export async function findBusinessPlanWithSections(
  projectId: string,
  planId: string,
): Promise<BusinessPlanWithSections | null> {
  const plan = await findBusinessPlan(planId);
  if (!plan || plan.projectId !== projectId) return null;
  const sections = await findBusinessPlanSections(planId);
  return { ...plan, sections };
}

export async function findBusinessPlanSectionById(
  sectionId: string,
): Promise<BusinessPlanSection | null> {
  if (!isSupabaseConfigured()) return null;
  const repo = getBusinessPlanSectionRepository();
  return repo.findById(sectionId);
}
