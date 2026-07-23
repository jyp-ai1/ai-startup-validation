import type { ExecutionPlan } from '@/features/agents/orchestrator';
import type { ProjectDashboardStats } from '@/features/dashboard/types';
import type { ExecutiveWorkspaceViewModel } from '@/features/executive';
import type { RecommendedAction } from '@/features/decision';
import type { StrategyWorkspaceViewModel } from '@/features/strategy-workspace';

export type ConsultantModuleId =
  | 'RESEARCH'
  | 'VOC'
  | 'EVIDENCE'
  | 'COMPETITOR'
  | 'GOVERNMENT'
  | 'DECISION';

export type ConsultantModuleStatus = {
  id: ConsultantModuleId;
  labelKey: string;
  percent: number;
  status: 'ready' | 'progress' | 'blocked';
  statusKey: string;
};

export type ConsultantRecommendation = RecommendedAction & {
  rank: number;
};

export type ConsultantQuestion = {
  id: string;
  questionKey: string;
  hintKey?: string;
  href: string;
  fieldId: string;
};

export type ConsultantMemoryItem = {
  id: string;
  type: 'EXECUTION' | 'ANALYSIS' | 'REPORT';
  labelKey: string;
  occurredAt: string;
  href: string;
};

export type ConsultantFeedItem = {
  id: string;
  type: 'RESEARCH' | 'EVIDENCE' | 'DECISION' | 'REPORT' | 'AGENT' | 'VOC' | 'COMPETITOR';
  labelKey: string;
  params?: Record<string, string | number>;
  occurredAt: string;
  status: 'completed' | 'running' | 'pending';
};

export type ConsultantActionId =
  | 'ai_research'
  | 'generate_decision'
  | 'generate_report'
  | 'continue_research';

export type ConsultantAction = {
  id: ConsultantActionId;
  labelKey: string;
  href: string;
  variant: 'default' | 'outline';
  enabled: boolean;
};

export type ConsultantPromptId =
  | 'market_research'
  | 'find_competitors'
  | 'find_grants'
  | 'show_risks'
  | 'go_probability';

export type ConsultantPrompt = {
  id: ConsultantPromptId;
  labelKey: string;
  href: string;
};

export type ConsultantProjectContext = {
  projectId: string;
  title: string;
  industry: string | null;
  industryKey: string;
  stageKey: string;
  target: string | null;
  targetKey: string;
  score: number;
  decisionLabelKey: string;
  decisionAvailable: boolean;
  timelineStageKey: string;
};

export type ConsultantViewModel = {
  projectId: string;
  projectTitle: string;
  summaryKey: string;
  summaryParams?: Record<string, string | number>;
  goProbability: number;
  goProbabilityLabelKey: string;
  modules: ConsultantModuleStatus[];
  topRecommendation: {
    labelKey: string;
    descriptionKey: string;
    href: string;
    manualHref: string;
  } | null;
  recommendations: ConsultantRecommendation[];
  context: ConsultantProjectContext;
  questions: ConsultantQuestion[];
  memory: ConsultantMemoryItem[];
  actions: ConsultantAction[];
  prompts: ConsultantPrompt[];
  feed: ConsultantFeedItem[];
};

import type { OnboardingContext } from '@/features/onboarding-consultant/types';

export type ConsultantInput = {
  stats: ProjectDashboardStats;
  executive: ExecutiveWorkspaceViewModel | null;
  strategy: StrategyWorkspaceViewModel | null;
  hasExecutiveReport: boolean;
  orchestratorPlan: ExecutionPlan | null;
  onboardingContext?: OnboardingContext | null;
};
