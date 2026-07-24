import { randomUUID } from 'crypto';

import type {
  AgentExecutionRecord,
  GeneratedEvidenceItem,
  ResearchApprovalStatus,
  ResearchJob,
  ResearchProviderId,
  ResearchRequest,
} from './research-agent-types';
import { buildEvidenceFromResult, countEvidence } from './evidence-builder';
import { persistResearchEvidence } from './evidence-persistence';
import { advanceJobThroughPipeline, enqueueJob, transitionJob } from './job-queue';
import { getResearchProviderService } from './research-provider';
import { planResearchTasks } from './task-planner';
import { knowledgeStore } from '../repositories/mock-knowledge-store';
import type {
  AgentExecutionResult,
  MergedEvidenceItem,
  OrchestratorContext,
} from '../../orchestrator/services/orchestrator-types';
import { resolveResearchProviderId } from '@/lib/ai/config';

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
    const job = await this.setApproval(jobId, 'APPROVED');
    if (!job || job.evidencePersisted) return job;

    const persistedEvidenceCount = await persistResearchEvidence(job);
    if (persistedEvidenceCount === 0) return job;

    const updated: ResearchJob = {
      ...job,
      evidencePersisted: true,
      persistedEvidenceCount,
    };
    await knowledgeStore.updateJob(updated);
    return updated;
  }

  async rejectJob(jobId: string): Promise<ResearchJob | null> {
    return this.setApproval(jobId, 'REJECTED');
  }

  private async setApproval(
    jobId: string,
    status: ResearchApprovalStatus,
  ): Promise<ResearchJob | null> {
    const job = await knowledgeStore.getJob(jobId);
    if (!job || job.state !== 'COMPLETED' || job.approvalStatus !== 'PENDING_REVIEW') {
      return null;
    }

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

function confidenceToScore(level: GeneratedEvidenceItem['confidence']): number {
  switch (level) {
    case 'HIGH':
      return 88;
    case 'MEDIUM':
      return 72;
    default:
      return 55;
  }
}

/** Synchronous research for orchestrator RESEARCH worker (L3.2). */
export async function runResearchSync(ctx: OrchestratorContext): Promise<AgentExecutionResult> {
  const startMs = Date.now();
  const providerId = resolveResearchProviderId();
  const request: ResearchRequest = {
    projectId: ctx.projectId,
    projectTitle: ctx.projectTitle,
    projectType: ctx.projectType,
    industry: ctx.industry,
    country: ctx.country,
    language: ctx.language,
    targetCustomer: ctx.targetCustomer,
  };
  const tasks = planResearchTasks(request);
  const provider = getResearchProviderService(providerId);
  const result = await provider.execute(request, tasks);

  const evidence: MergedEvidenceItem[] = result.evidence.map((item) => ({
    id: item.id,
    agentId: 'RESEARCH',
    titleKey: item.titleKey,
    summaryKey: item.summaryKey,
    confidence: confidenceToScore(item.confidence),
    sourceAgent: 'RESEARCH',
  }));

  const knowledge = [
    {
      id: randomUUID(),
      agentId: 'RESEARCH' as const,
      labelKey: 'evidence.research.knowledge',
      valueKey: 'summaries.research',
      confidence: result.confidence,
      relatedAgents: ['RESEARCH' as const],
    },
  ];

  const durationMs = Date.now() - startMs;
  const estimatedTokens = Math.round(900 + durationMs * 1.2);

  return {
    agentId: 'RESEARCH',
    confidence: result.confidence,
    evidence,
    knowledge,
    summaryKey: 'summaries.research',
    cost: {
      provider: providerId === 'gemini' ? 'openrouter' : providerId,
      durationMs,
      estimatedTokens,
      estimatedCostUsd: providerId === 'mock' ? estimatedTokens * 0.000002 : 0.002,
      retryCount: 0,
    },
  };
}
