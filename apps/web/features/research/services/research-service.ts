import { isSupabaseConfigured } from '@repo/db';
import type { ResearchPlan } from '@repo/types/validation';

import { getResearchPlanRepository } from '@/lib/db/platform';

export async function listResearchPlans(projectId: string): Promise<ResearchPlan[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getResearchPlanRepository();
  return repo.findByProjectId(projectId);
}

export async function findResearchPlan(
  id: string,
): Promise<ResearchPlan | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getResearchPlanRepository();
  return repo.findById(id);
}
