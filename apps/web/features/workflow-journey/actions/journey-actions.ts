'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { isWorkflowGoalId, type WorkflowGoalId } from '../types';
import { journeyCookieOptions, WORKFLOW_GOAL_COOKIE, WORKFLOW_TEMPLATE_COOKIE } from '../lib/journey-cookies';
import { getWorkflowTemplate } from '../constants/templates';

export async function selectGoalAction(formData: FormData) {
  const raw = formData.get('goalId');
  const goalId = typeof raw === 'string' ? raw : '';
  if (!isWorkflowGoalId(goalId)) {
    redirect('/goal');
  }

  const template = getWorkflowTemplate(goalId);
  const cookieStore = await cookies();
  const opts = journeyCookieOptions();

  cookieStore.set(WORKFLOW_GOAL_COOKIE, goalId, opts);
  cookieStore.set(WORKFLOW_TEMPLATE_COOKIE, template.id, opts);

  redirect('/workflow');
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
