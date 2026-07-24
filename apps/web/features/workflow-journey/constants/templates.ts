import type { WorkflowGoalId, WorkflowTemplate } from '../types';

/** Mock workflow plans — no LLM (Epic 1 Sprint 1). */
const STEP_IDS = [
  'context',
  'market',
  'competition',
  'evidence',
  'decision',
  'execution',
] as const;

function buildTemplate(goalId: WorkflowGoalId, stepCount: number, templateId: string): WorkflowTemplate {
  const steps = STEP_IDS.slice(0, stepCount).map((id, index) => ({
    id,
    order: index + 1,
  }));
  return { id: templateId, goalId, stepCount, steps };
}

export const WORKFLOW_TEMPLATES: Record<WorkflowGoalId, WorkflowTemplate> = {
  'business-viability': buildTemplate('business-viability', 5, 'startup-viability'),
  'new-business': buildTemplate('new-business', 6, 'corporate-new-business'),
  'mvp-development': buildTemplate('mvp-development', 5, 'mvp-build'),
  'investment-prep': buildTemplate('investment-prep', 6, 'investor-readiness'),
  'market-research': buildTemplate('market-research', 4, 'market-intel'),
};

export function getWorkflowTemplate(goalId: WorkflowGoalId): WorkflowTemplate {
  return WORKFLOW_TEMPLATES[goalId];
}
