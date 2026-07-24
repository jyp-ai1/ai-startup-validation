'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isWorkflowGoalId } from '../types';
import { journeyCookieOptions, WORKFLOW_GOAL_COOKIE, WORKFLOW_TEMPLATE_COOKIE } from '../lib/journey-cookies';
import { getWorkflowTemplate } from '../constants/templates';

export type SaveGoalResult = { ok: true } | { ok: false; error: 'invalid_goal' };

/** Sets journey cookies without redirect — client navigates (P0 hotfix). */
export async function saveGoalAction(goalId: string): Promise<SaveGoalResult> {
  if (!isWorkflowGoalId(goalId)) {
    return { ok: false, error: 'invalid_goal' };
  }

  const template = getWorkflowTemplate(goalId);
  const cookieStore = await cookies();
  const opts = journeyCookieOptions();

  cookieStore.set(WORKFLOW_GOAL_COOKIE, goalId, opts);
  cookieStore.set(WORKFLOW_TEMPLATE_COOKIE, template.id, opts);

  return { ok: true };
}

/** @deprecated Prefer saveGoalAction + client router — kept for form fallback */
export async function selectGoalAction(formData: FormData) {
  const raw = formData.get('goalId');
  const goalId = typeof raw === 'string' ? raw : '';
  const result = await saveGoalAction(goalId);
  if (!result.ok) {
    redirect('/goal');
  }
  redirect('/workflow?compose=1');
}

export async function confirmWorkflowAction() {
  redirect('/workspace');
}

export async function startWorkspaceAction(demoMode: boolean) {
  if (demoMode) {
    redirect('/workspace?demo=1');
  }
  redirect('/auth/login?next=/workspace');
}
