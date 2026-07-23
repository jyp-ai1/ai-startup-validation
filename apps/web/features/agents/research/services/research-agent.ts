import { randomUUID } from 'crypto';

import type {
  AgentExecutionRecord,
  ResearchApprovalStatus,
  ResearchJob,
  ResearchProviderId,
  ResearchRequest,
} from './research-agent-types';
import { buildEvidenceFromResult, countEvidence } from './evidence-builder';
import { advanceJobThroughPipeline, enqueueJob, transitionJob } from './job-queue';
import { getResearchProviderService } from './research-provider';
import { planResearchTasks } from './task-planner';
import { knowledgeStore } from '../repositories/mock-knowledge-store';

function createJob(request: ResearchRequest, providerId: ResearchProviderId): ResearchJob {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    request,
    tasks: planResearchTasks(request),
    state: 'QUEUED',
    stateHistory: [{ state: 'QUEUED', at: now }],
    providerId,
    result: null,
    approvalStatus: 'PENDING_REVIEW',
    startedAt: now,
    completedAt: null,
    durationMs: null,
    evidenceCount: 0,
    errorMessage: null,
  };
}

async function saveExecution(job: ResearchJob, status: 'SUCCESS' | 'FAILED'): Promise<void> {
  const record: AgentExecutionRecord = {
    id: randomUUID(),
    jobId: job.id,
    projectId: job.request.projectId,
    providerId: job.providerId,
    status,
    startedAt: job.startedAt,
    completedAt: job.completedAt ?? new Date().toISOString(),
    durationMs: job.durationMs ?? 0,
    evidenceCount: job.evidenceCount,
    approvalStatus: job.approvalStatus,
  };
  await knowledgeStore.saveExecution(record);
}

/**
 * ResearchAgent — generates evidence only. Never calls Decision Engine.
 */
export class ResearchAgent {
  async startResearch(
    request: ResearchRequest,
    providerId: ResearchProviderId = 'mock',
  ): Promise<ResearchJob> {
    const job = createJob(request, providerId);
    await knowledgeStore.saveJob(job);

    await enqueueJob(job.id, async () => {
      await this.runJob(job.id);
    });

    return (await knowledgeStore.getJob(job.id)) ?? job;
  }

  private async runJob(jobId: string): Promise<void> {
    let job = await knowledgeStore.getJob(jobId);
    if (!job) return;

    const startMs = Date.now();

    try {
      job = await advanceJobThroughPipeline(job);
      const provider = getResearchProviderService(job.providerId);
      const result = await provider.execute(job.request, job.tasks);
      buildEvidenceFromResult(result);

      job = await transitionJob(job, 'COMPLETED');
      job = {
        ...job,
        result,
        evidenceCount: countEvidence(result),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
        approvalStatus: 'PENDING_REVIEW',
      };
      await knowledgeStore.updateJob(job);
      await saveExecution(job, 'SUCCESS');
    } catch (error) {
      job = await transitionJob(job, 'FAILED');
      job = {
        ...job,
        errorMessage: error instanceof Error ? error.message : 'Research agent failed',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startMs,
      };
      await knowledgeStore.updateJob(job);
      await saveExecution(job, 'FAILED');
    }
  }

  async approveJob(jobId: string): Promise<ResearchJob | null> {
    return this.setApproval(jobId, 'APPROVED');
  }

  async rejectJob(jobId: string): Promise<ResearchJob | null> {
    return this.setApproval(jobId, 'REJECTED');
  }

  private async setApproval(
    jobId: string,
    status: ResearchApprovalStatus,
  ): Promise<ResearchJob | null> {
    const job = await knowledgeStore.getJob(jobId);
    if (!job || job.state !== 'COMPLETED') return null;

    const updated = { ...job, approvalStatus: status };
    await knowledgeStore.updateJob(updated);
    return updated;
  }
}

export const researchAgent = new ResearchAgent();

export async function getProjectResearchJobs(projectId: string): Promise<ResearchJob[]> {
  return knowledgeStore.listJobsByProject(projectId);
}

export async function getAgentActivityStats() {
  return knowledgeStore.getActivityStats();
}

export async function getProjectExecutionHistory(projectId: string) {
  return knowledgeStore.listExecutionsByProject(projectId);
}

export async function getResearchJob(jobId: string) {
  return knowledgeStore.getJob(jobId);
}
