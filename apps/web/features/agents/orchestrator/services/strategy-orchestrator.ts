import { randomUUID } from 'crypto';

import type { AppLocale } from '@repo/i18n/config';
import type { StartupProject } from '@repo/types/validation';

import { getAgentWorker } from './agent-registry';
import {
  buildConfidenceLineage,
  buildPriorResults,
  mergeEvidence,
  mergeKnowledge,
  sumCosts,
} from './knowledge-merge';
import { buildExecutionPlanNodes } from './strategy-planner';
import type {
  AgentId,
  ExecutionPlan,
  OrchestratorContext,
  TaskNode,
  TaskNodeStatus,
} from './orchestrator-types';
import { triggerDecisionForPlan } from './decision-trigger';
import {
  getPlan,
  listPlansByProject,
  savePlan,
  updatePlan,
  getLatestPlan,
  getExecutionCenterStats,
} from '../repositories/orchestrator-store';

function nodeDepsMet(node: TaskNode, nodes: TaskNode[]): boolean {
  return node.dependsOn.every((depId) => {
    const dep = nodes.find((n) => n.id === depId);
    return dep?.status === 'COMPLETED' || dep?.status === 'SKIPPED';
  });
}

function getRunnableNodes(nodes: TaskNode[]): TaskNode[] {
  return nodes.filter(
    (n) =>
      n.status === 'QUEUED' &&
      n.agentId !== 'DECISION' &&
      nodeDepsMet(n, nodes),
  );
}

function buildContext(plan: ExecutionPlan, priorResults: Map<AgentId, import('./orchestrator-types').AgentExecutionResult>): OrchestratorContext {
  return {
    projectId: plan.projectId,
    projectTitle: plan.projectTitle,
    projectType: plan.projectType,
    industry: null,
    country: null,
    language: 'en' as AppLocale,
    targetCustomer: null,
    priorResults,
  };
}

async function executeNode(plan: ExecutionPlan, nodeId: string): Promise<ExecutionPlan> {
  const nodes = [...plan.nodes];
  const idx = nodes.findIndex((n) => n.id === nodeId);
  if (idx < 0) return plan;

  const node = { ...nodes[idx]! };
  if (node.status === 'PAUSED' || node.status === 'COMPLETED') return plan;

  const worker = getAgentWorker(node.agentId);
  if (!worker) {
    node.status = 'FAILED';
    node.errorMessage = 'Agent not registered';
    nodes[idx] = node;
    return { ...plan, nodes };
  }

  node.status = 'RUNNING';
  node.startedAt = new Date().toISOString();
  nodes[idx] = node;
  await updatePlan({ ...plan, nodes, status: 'RUNNING' });

  const priorResults = buildPriorResults(nodes) as Map<AgentId, import('./orchestrator-types').AgentExecutionResult>;
  const ctx = buildContext(plan, priorResults);

  try {
    const result = await worker.execute(ctx);
    node.status = 'COMPLETED';
    node.result = result;
    node.cost = result.cost;
    node.completedAt = new Date().toISOString();
    node.errorMessage = null;
  } catch (error) {
    node.retryCount += 1;
    if (node.retryCount >= node.maxRetries) {
      node.status = 'FAILED';
      node.errorMessage = error instanceof Error ? error.message : 'Agent failed';
      node.completedAt = new Date().toISOString();
    } else {
      node.status = 'QUEUED';
    }
  }

  nodes[idx] = node;
  return { ...plan, nodes };
}

async function runScheduler(planId: string): Promise<ExecutionPlan | null> {
  let plan = await getPlan(planId);
  if (!plan) return null;

  plan = {
    ...plan,
    status: 'RUNNING',
    nodes: plan.nodes.map((n) =>
      n.agentId === 'DECISION'
        ? { ...n, status: 'WAITING' as TaskNodeStatus }
        : n.status === 'PLANNING'
          ? { ...n, status: 'QUEUED' as TaskNodeStatus }
          : n,
    ),
  };
  await updatePlan(plan);

  while (true) {
    plan = (await getPlan(planId))!;
    const runnable = getRunnableNodes(plan.nodes);

    if (runnable.length === 0) {
      const hasFailed = plan.nodes.some((n) => n.status === 'FAILED');
      const allNonDecisionDone = plan.nodes
        .filter((n) => n.agentId !== 'DECISION')
        .every((n) => n.status === 'COMPLETED' || n.status === 'SKIPPED' || n.status === 'PAUSED');

      if (hasFailed) {
        plan = { ...plan, status: 'FAILED', completedAt: new Date().toISOString() };
      } else if (allNonDecisionDone) {
        const costs = sumCosts(plan.nodes);
        plan = {
          ...plan,
          status: 'WAITING',
          completedAt: new Date().toISOString(),
          mergedKnowledge: mergeKnowledge(plan.nodes),
          mergedEvidence: mergeEvidence(plan.nodes),
          confidenceLineage: buildConfidenceLineage(plan.nodes),
          totalCostUsd: costs.totalCostUsd,
          totalDurationMs: costs.totalDurationMs,
          approvalStatus: 'PENDING_REVIEW',
        };
      }
      await updatePlan(plan);
      break;
    }

    for (const r of runnable) {
      plan = await executeNode(plan, r.id);
      await updatePlan(plan);
    }
  }

  return getPlan(planId);
}

export class StrategyOrchestrator {
  async startPlan(project: Pick<StartupProject, 'id' | 'title' | 'projectType'>): Promise<ExecutionPlan> {
    const plan: ExecutionPlan = {
      id: randomUUID(),
      projectId: project.id,
      projectTitle: project.title,
      projectType: project.projectType,
      nodes: buildExecutionPlanNodes(project.projectType),
      status: 'PLANNING',
      startedAt: new Date().toISOString(),
      completedAt: null,
      mergedKnowledge: [],
      mergedEvidence: [],
      confidenceLineage: null,
      decisionResult: null,
      approvalStatus: 'PENDING_REVIEW',
      totalCostUsd: 0,
      totalDurationMs: 0,
    };

    await savePlan(plan);
    await runScheduler(plan.id);
    return (await getPlan(plan.id)) ?? plan;
  }

  async approvePlan(planId: string): Promise<ExecutionPlan | null> {
    let plan = await getPlan(planId);
    if (!plan || plan.status !== 'WAITING') return null;

    plan = { ...plan, approvalStatus: 'APPROVED' };
    await updatePlan(plan);

    const decisionNode = plan.nodes.find((n) => n.agentId === 'DECISION');
    if (decisionNode) {
      const nodes = plan.nodes.map((n) =>
        n.agentId === 'DECISION'
          ? { ...n, status: 'RUNNING' as TaskNodeStatus, startedAt: new Date().toISOString() }
          : n,
      );
      plan = { ...plan, nodes, status: 'RUNNING' };
      await updatePlan(plan);
    }

    const decisionResult = await triggerDecisionForPlan(plan);
    const lineageTotal = plan.confidenceLineage?.total;
    const decisionConfidence = decisionResult?.scores.confidence ?? 0;
    const decisionProvider = decisionResult?.providerId ?? 'mock';
    const nodes = plan.nodes.map((n) =>
      n.agentId === 'DECISION'
        ? {
            ...n,
            status: 'COMPLETED' as TaskNodeStatus,
            completedAt: new Date().toISOString(),
            result: {
              agentId: 'DECISION' as const,
              confidence: lineageTotal ?? decisionConfidence,
              evidence: [],
              knowledge: [],
              summaryKey: 'summaries.decision',
              cost: {
                provider: decisionProvider,
                durationMs: 500,
                estimatedTokens: 600,
                estimatedCostUsd: decisionProvider === 'mock' ? 0.001 : 0.002,
                retryCount: 0,
              },
            },
          }
        : n,
    );

    plan = {
      ...plan,
      nodes,
      status: 'COMPLETED',
      decisionResult,
      completedAt: new Date().toISOString(),
    };
    await updatePlan(plan);
    return plan;
  }

  async rejectPlan(planId: string): Promise<ExecutionPlan | null> {
    const plan = await getPlan(planId);
    if (!plan) return null;
    const updated = { ...plan, approvalStatus: 'REJECTED' as const };
    await updatePlan(updated);
    return updated;
  }

  async rerunNode(planId: string, nodeId: string): Promise<ExecutionPlan | null> {
    let plan = await getPlan(planId);
    if (!plan) return null;

    const nodes = plan.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            status: 'QUEUED' as TaskNodeStatus,
            result: null,
            cost: null,
            retryCount: 0,
            startedAt: null,
            completedAt: null,
            errorMessage: null,
          }
        : n,
    );

    plan = {
      ...plan,
      nodes,
      status: 'RUNNING',
      approvalStatus: 'PENDING_REVIEW',
      decisionResult: null,
    };
    await updatePlan(plan);

    const node = nodes.find((n) => n.id === nodeId);
    if (node && node.agentId !== 'DECISION') {
      plan = await executeNode(plan, nodeId);
      const costs = sumCosts(plan.nodes);
      plan = {
        ...plan,
        mergedKnowledge: mergeKnowledge(plan.nodes),
        mergedEvidence: mergeEvidence(plan.nodes),
        confidenceLineage: buildConfidenceLineage(plan.nodes),
        totalCostUsd: costs.totalCostUsd,
        totalDurationMs: costs.totalDurationMs,
        status: 'WAITING',
      };
      await updatePlan(plan);
    }

    return getPlan(planId);
  }

  async pauseNode(planId: string, nodeId: string): Promise<ExecutionPlan | null> {
    const plan = await getPlan(planId);
    if (!plan) return null;
    const nodes = plan.nodes.map((n) =>
      n.id === nodeId && n.status !== 'COMPLETED'
        ? { ...n, status: 'PAUSED' as TaskNodeStatus }
        : n,
    );
    const updated = { ...plan, nodes };
    await updatePlan(updated);
    return updated;
  }

  async resumeNode(planId: string, nodeId: string): Promise<ExecutionPlan | null> {
    const plan = await getPlan(planId);
    if (!plan) return null;
    const nodes = plan.nodes.map((n) =>
      n.id === nodeId && n.status === 'PAUSED'
        ? { ...n, status: 'QUEUED' as TaskNodeStatus }
        : n,
    );
    const updated = { ...plan, nodes, status: 'RUNNING' as const };
    await updatePlan(updated);
    return runScheduler(planId);
  }
}

export const strategyOrchestrator = new StrategyOrchestrator();

export {
  getPlan,
  listPlansByProject,
  getLatestPlan,
  getExecutionCenterStats,
};
