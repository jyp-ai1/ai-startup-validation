import type { PRDContext } from '@repo/types/validation';

import { collectBusinessPlanContext } from '@/features/business-plan/services/context-collector';
import { findBusinessPlanWithSections } from '@/features/business-plan/services/business-plan-service';
import { listBusinessPlans } from '@/features/business-plan/services/business-plan-service';

/** Collect validation + business plan context for PRD AI generation. */
export async function collectPRDContext(projectId: string): Promise<PRDContext | null> {
  const base = await collectBusinessPlanContext(projectId);
  if (!base) return null;

  const plans = await listBusinessPlans(projectId);
  const latestPlan = plans[0];
  let businessPlan: PRDContext['businessPlan'] = null;

  if (latestPlan) {
    const withSections = await findBusinessPlanWithSections(projectId, latestPlan.id);
    if (withSections) {
      businessPlan = {
        title: withSections.title,
        summary: withSections.summary,
        sections: withSections.sections.map((section) => ({
          sectionType: section.sectionType,
          title: section.title,
          content: section.content,
        })),
      };
    }
  }

  return { ...base, businessPlan };
}
