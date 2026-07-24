import { cookies } from 'next/headers';

import { isWorkflowGoalId, type WorkflowGoalId } from '../types';
import { getWorkflowTemplate } from '../constants/templates';

export const WORKFLOW_GOAL_COOKIE = 'WORKFLOW_GOAL_ID';
export const WORKFLOW_TEMPLATE_COOKIE = 'WORKFLOW_TEMPLATE_ID';

const MAX_AGE = 60 * 60 * 24 * 30;

export async function readJourneyGoal(): Promise<WorkflowGoalId | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(WORKFLOW_GOAL_COOKIE)?.value;
  if (!value || !isWorkflowGoalId(value)) return null;
  return value;
}

export function journeyCookieOptions() {
  return {
    path: '/',
    maxAge: MAX_AGE,
    sameSite: 'lax' as const,
  };
}

export function setJourneyGoalCookies(
  set: (name: string, value: string, options: ReturnType<typeof journeyCookieOptions>) => void,
  goalId: WorkflowGoalId,
): void {
  const template = getWorkflowTemplate(goalId);
  const opts = journeyCookieOptions();
  set(WORKFLOW_GOAL_COOKIE, goalId, opts);
  set(WORKFLOW_TEMPLATE_COOKIE, template.id, opts);
}
