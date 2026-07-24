import type { AppLocale } from '@repo/i18n/config';
import type { ProjectType } from '@repo/types/validation';

/** Workflow states — async job queue ready for Browser/MCP providers. */
export type AgentWorkflowState =
  | 'QUEUED'
  | 'RUNNING'
  | 'SEARCHING'
  | 'EXTRACTING'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'FAILED';

export type ResearchProviderId =
  | 'mock'
  | 'openai'
  | 'claude'
  | 'gemini'
  | 'perplexity'
  | 'mcp_search'
  | 'browser_agent';

export type ResearchApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export type ResearchTaskType = 'MARKET' | 'COMPETITOR' | 'GOVERNMENT' | 'VOC' | 'TECHNOLOGY';

export type ResearchRequest = {
  projectId: string;
  projectTitle: string;
  projectType: ProjectType;
  industry: string | null;
  country: string | null;
  language: AppLocale;
  targetCustomer: string | null;
};

export type ResearchSource = {
  id: string;
  titleKey: string;
  title?: string;
  url?: string;
  sourceType: 'WEB' | 'GOVERNMENT' | 'NEWS' | 'REPORT';
};

export type GeneratedEvidenceItem = {
  id: string;
  titleKey: string;
  summaryKey: string;
  title?: string;
  summary?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sourceId: string;
  category: ResearchTaskType;
};

export type ResearchResultPayload = {
  summaryKey: string;
  summaryText?: string;
  summaryParams?: Record<string, string | number>;
  evidence: GeneratedEvidenceItem[];
  market: { insightKey: string; insightText?: string; score: number };
  competitor: { insightKey: string; insightText?: string; count: number };
  government: { insightKey: string; insightText?: string; programs: number };
  sources: ResearchSource[];
  confidence: number;
};

export type AgentStateTransition = {
  state: AgentWorkflowState;
  at: string;
};

export type ResearchJob = {
  id: string;
  request: ResearchRequest;
  tasks: ResearchTaskType[];
  state: AgentWorkflowState;
  stateHistory: AgentStateTransition[];
  providerId: ResearchProviderId;
  result: ResearchResultPayload | null;
  approvalStatus: ResearchApprovalStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  evidenceCount: number;
  errorMessage: string | null;
  /** Set after approve → Evidence DB persistence (L3.1). */
  evidencePersisted?: boolean;
  persistedEvidenceCount?: number;
};

export type AgentExecutionRecord = {
  id: string;
  jobId: string;
  projectId: string;
  providerId: ResearchProviderId;
  status: 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt: string;
  durationMs: number;
  evidenceCount: number;
  approvalStatus: ResearchApprovalStatus;
};

export type AgentActivityStats = {
  runningCount: number;
  recentCompleted: number;
  avgDurationMs: number;
  recentJobs: ResearchJob[];
};

export interface ResearchProvider {
  readonly id: ResearchProviderId;
  execute(
    request: ResearchRequest,
    tasks: ResearchTaskType[],
  ): Promise<ResearchResultPayload>;
}

export interface KnowledgeStore {
  saveJob(job: ResearchJob): Promise<void>;
  updateJob(job: ResearchJob): Promise<void>;
  getJob(id: string): Promise<ResearchJob | null>;
  listJobsByProject(projectId: string): Promise<ResearchJob[]>;
  listRecentJobs(limit?: number): Promise<ResearchJob[]>;
  saveExecution(record: AgentExecutionRecord): Promise<void>;
  listExecutionsByProject(projectId: string): Promise<AgentExecutionRecord[]>;
  getActivityStats(): Promise<AgentActivityStats>;
}
