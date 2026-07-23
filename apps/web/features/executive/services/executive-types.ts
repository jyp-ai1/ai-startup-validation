import type { ProjectType, StartupProject, StartupProjectStatus } from '@repo/types/validation';

import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type {
  DecisionResult,
  DecisionVerdict,
  RecommendedAction,
  RiskMatrixItem,
  OpportunityItem,
} from '@/features/decision';
import type { ProjectDashboardStats } from '@/features/dashboard/types';

export type ExecutiveKpiValue = {
  id: string;
  labelKey: string;
  value: string | number;
  unitKey?: string;
  trend?: 'up' | 'down' | 'neutral';
  placeholder?: boolean;
};

export type ExecutiveKeyMetric = {
  id: string;
  labelKey: string;
  value: number;
  max?: number;
  format: 'score' | 'percent';
};

export type ExecutiveInboxItem = {
  id: string;
  type: 'MARKET_UPDATE' | 'COMPETITOR_INVESTMENT' | 'POLICY_CHANGE' | 'EVIDENCE_DROP';
  titleKey: string;
  summaryKey: string;
  occurredAt: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  read: boolean;
};

export type ExecutiveActionItem = RecommendedAction & {
  ownerKey: string;
  etaDays: number;
};

export type ExecutiveEvidenceItem = {
  id: string;
  title: string;
  sourceKey: string;
  confidence: number;
  date: string;
  href: string;
};

export type ExecutiveWorkspaceViewModel = {
  project: StartupProject;
  stats: ProjectDashboardStats;
  decision: DecisionResult;
  orchestratorPlan: ExecutionPlan | null;
  verdict: DecisionVerdict;
  stage: StartupProjectStatus;
  confidence: number;
  summaryKeys: string[];
  summaryParams?: Record<string, string | number>[];
  typeKpis: ExecutiveKpiValue[];
  keyMetrics: ExecutiveKeyMetric[];
  risks: RiskMatrixItem[];
  opportunities: OpportunityItem[];
  actions: ExecutiveActionItem[];
  evidence: ExecutiveEvidenceItem[];
  inbox: ExecutiveInboxItem[];
  projectType: ProjectType;
};
