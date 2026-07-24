/** Constitution IA — five goal options (Epic 1 Sprint 1). */
export const WORKFLOW_GOAL_IDS = [
  'business-viability',
  'new-business',
  'mvp-development',
  'investment-prep',
  'market-research',
] as const;

export type WorkflowGoalId = (typeof WORKFLOW_GOAL_IDS)[number];

export type WorkflowStep = {
  id: string;
  order: number;
};

export type WorkflowTemplate = {
  id: string;
  goalId: WorkflowGoalId;
  stepCount: number;
  steps: WorkflowStep[];
};

export function isWorkflowGoalId(value: string): value is WorkflowGoalId {
  return (WORKFLOW_GOAL_IDS as readonly string[]).includes(value);
}
