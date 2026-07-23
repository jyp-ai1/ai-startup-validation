'use server';

import { revalidatePath } from 'next/cache';

import { getProject } from '@/features/projects/actions/project-actions';

import {
  getExecutionCenterStats,
  getLatestPlan,
  listPlansByProject,
  strategyOrchestrator,
} from '../services/strategy-orchestrator';

export type OrchestratorActionState = {
  error?: string;
  planId?: string;
};

export async function startOrchestratorPlan(
  projectId: string,
): Promise<OrchestratorActionState> {
  const project = await getProject(projectId);
  if (!project) return { error: 'Project not found' };

  try {
    const plan = await strategyOrchestrator.startPlan({
      id: project.id,
      title: project.title,
      projectType: project.projectType,
    });
    revalidatePath('/dashboard');
    revalidatePath(`/projects/${projectId}/decision`);
    return { planId: plan.id };
  } catch {
    return { error: 'Failed to start orchestrator plan' };
  }
}

export async function approveOrchestratorPlan(planId: string, projectId: string) {
  const plan = await strategyOrchestrator.approvePlan(planId);
  if (!plan) return { error: 'Plan not found or not ready for approval' };
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}/decision`);
  return { success: true };
}

export async function rejectOrchestratorPlan(planId: string, projectId: string) {
  const plan = await strategyOrchestrator.rejectPlan(planId);
  if (!plan) return { error: 'Plan not found' };
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}/decision`);
  return { success: true };
}

export async function rerunOrchestratorNode(
  planId: string,
  nodeId: string,
  projectId: string,
) {
  const plan = await strategyOrchestrator.rerunNode(planId, nodeId);
  if (!plan) return { error: 'Plan or node not found' };
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}/decision`);
  return { success: true };
}

export async function pauseOrchestratorNode(
  planId: string,
  nodeId: string,
  projectId: string,
) {
  const plan = await strategyOrchestrator.pauseNode(planId, nodeId);
  if (!plan) return { error: 'Plan or node not found' };
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}/decision`);
  return { success: true };
}

export async function resumeOrchestratorNode(
  planId: string,
  nodeId: string,
  projectId: string,
) {
  const plan = await strategyOrchestrator.resumeNode(planId, nodeId);
  if (!plan) return { error: 'Plan or node not found' };
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}/decision`);
  return { success: true };
}

export { getExecutionCenterStats, getLatestPlan, listPlansByProject };
