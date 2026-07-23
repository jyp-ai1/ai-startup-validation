import type { AppLocale } from '@repo/i18n/config';
import type { ProjectType } from '@repo/types/validation';

import type { DecisionResult } from '@/features/decision/services/decision-types';

export type AgentId =
  | 'RESEARCH'
  | 'MARKET'
  | 'COMPETITOR'
  | 'GOVERNMENT'
  | 'TECHNOLOGY'
  | 'INVESTMENT'
  | 'FRAMEWORK'
  | 'VOC'
  | 'DECISION';

export type TaskNodeStatus =
  | 'PLANNING'
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED'
  | 'SKIPPED';

export type ExecutionPlanStatus =
  | 'PLANNING'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED';

export type OrchestratorApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type AgentCostRecord = {
  provider: string;
  durationMs: number;
  estimatedTokens: number;
  estimatedCostUsd: number;
  retryCount: number;
};

export type MergedEvidenceItem = {
  id: string;
  agentId: AgentId;
  titleKey: string;
  summaryKey: string;
  confidence: number;
  sourceAgent: AgentId;
};

export type KnowledgeNode = {
  id: string;
  agentId: AgentId;
  labelKey: string;
  valueKey: string;
  confidence: number;
  relatedAgents: AgentId[];
};

export type AgentExecutionResult = {
  agentId: AgentId;
  confidence: number;
  evidence: MergedEvidenceItem[];
  knowledge: KnowledgeNode[];
  summaryKey: string;
  cost: AgentCostRecord;
};

export type ConfidenceLineageNode = {
  id: string;
  labelKey: string;
  confidence: number;
  children?: ConfidenceLineageNode[];
};

export type ConfidenceLineage = {
  total: number;
  tree: ConfidenceLineageNode[];
};

export type OrchestratorContext = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  industry: string | null;
  country: string | null;
  language: AppLocale;
  targetCustomer: string | null;
  priorResults: Map<AgentId, AgentExecutionResult>;
};

export interface StrategyAgentWorker {
  readonly id: AgentId;
  readonly nameKey: string;
  readonly capabilityKey: string;
  readonly priority: number;
  readonly estimatedDurationMs: number;
  execute(context: OrchestratorContext): Promise<AgentExecutionResult>;
}

export type TaskNode = {
  id: string;
  agentId: AgentId;
  labelKey: string;
  status: TaskNodeStatus;
  dependsOn: string[];
  parallelGroup: number;
  result: AgentExecutionResult | null;
  retryCount: number;
  maxRetries: number;
  cost: AgentCostRecord | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
};

export type ExecutionPlan = {
  id: string;
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  nodes: TaskNode[];
  status: ExecutionPlanStatus;
  startedAt: string;
  completedAt: string | null;
  mergedKnowledge: KnowledgeNode[];
  mergedEvidence: MergedEvidenceItem[];
  confidenceLineage: ConfidenceLineage | null;
  decisionResult: DecisionResult | null;
  approvalStatus: OrchestratorApprovalStatus;
  totalCostUsd: number;
  totalDurationMs: number;
};

export type ExecutionCenterStats = {
  activePlans: number;
  runningTasks: number;
  queuedTasks: number;
  completedPlans: number;
  avgDurationMs: number;
  recentPlans: ExecutionPlan[];
};
