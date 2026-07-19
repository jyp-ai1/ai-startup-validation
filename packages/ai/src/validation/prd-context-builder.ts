import type { PRDContext } from '@repo/types/validation';

import { buildBusinessPlanContextText } from './business-plan-context-builder';

/** Serialize PRD context including business plan for LLM. */
export function buildPRDContextText(context: PRDContext): string {
  const base = buildBusinessPlanContextText(context);
  const parts = [base];

  if (context.businessPlan) {
    const plan = context.businessPlan;
    parts.push(`# Business Plan: ${plan.title}`);
    if (plan.summary) {
      parts.push(`Summary: ${plan.summary}`);
    }
    for (const section of plan.sections) {
      if (section.content.trim()) {
        parts.push(
          `## ${section.title} (${section.sectionType})\n${section.content.slice(0, 1200)}`,
        );
      }
    }
  }

  return parts.join('\n\n');
}
