'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';

import { getProject } from '@/features/projects/actions/project-actions';
import { resolveResearchProviderId } from '@/lib/ai/config';

import {
  getAgentActivityStats,
  getProjectExecutionHistory,
  getProjectResearchJobs,
  getResearchJob,
  researchAgent,
} from '../services/research-agent';
import { projectToResearchRequestWithLocale } from '../services/research-request';

export type ResearchAgentActionState = {
  error?: string;
  jobId?: string;
};

export async function startResearchAgent(
  projectId: string,
): Promise<ResearchAgentActionState> {
  const project = await getProject(projectId);
  if (!project) return { error: 'Project not found' };

  const locale = await getLocale();
  const request = projectToResearchRequestWithLocale(project, locale as 'ko' | 'en');

  try {
    const providerId = resolveResearchProviderId();
    const job = await researchAgent.startResearch(request, providerId);
    revalidatePath(`/projects/${projectId}/research`);
    revalidatePath('/dashboard');
    return { jobId: job.id };
  } catch {
    return { error: 'Failed to start research agent' };
  }
}

export async function approveResearchJob(jobId: string, projectId: string) {
  const job = await researchAgent.approveJob(jobId);
  if (!job) return { error: 'Job not found or not completed' };
  revalidatePath(`/projects/${projectId}/research`);
  revalidatePath(`/projects/${projectId}/evidence`);
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');
  return {
    success: true,
    persistedEvidenceCount: job.persistedEvidenceCount ?? 0,
  };
}

export async function rejectResearchJob(jobId: string, projectId: string) {
  const job = await researchAgent.rejectJob(jobId);
  if (!job) return { error: 'Job not found or not completed' };
  revalidatePath(`/projects/${projectId}/research`);
  return { success: true };
}

export {
  getAgentActivityStats,
  getProjectExecutionHistory,
  getProjectResearchJobs,
  getResearchJob,
};
