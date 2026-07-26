/** Shared agent layer types — domain only, no UI or SDK imports. */

export type {
  ResearchOutput,
  PlannerOutput,
  PlannerResearchStep,
  StrategyInput,
  StrategyOutput,
  DecisionInput,
  DecisionOutput,
  ExecutionInput,
  ExecutionOutput,
  AgentPipelineOutput,
} from './contracts';

import type {
  DecisionOutput,
  ExecutionOutput,
  PlannerOutput,
  ResearchOutput,
  StrategyOutput,
} from './contracts';

export type AgentProviderId = 'mock' | 'openrouter' | 'rag' | 'hybrid' | 'openai' | 'anthropic';

export type AgentProjectContext = {
  projectId: string;
  projectTitle: string;
  ideaSummary: string;
  goalId: string;
  industry?: string;
  locale: string;
};

export type ResearchDomain =
  | 'market'
  | 'customer'
  | 'competitor'
  | 'trend'
  | 'pricing'
  | 'government'
  | 'investment';

export type ResearchSource = {
  id: string;
  title: string;
  url?: string;
  sourceType: 'WEB' | 'GOVERNMENT' | 'NEWS' | 'DATABASE' | 'REPORT';
};

export type ResearchFinding = {
  domain: ResearchDomain;
  title: string;
  summary: string;
  confidence: number;
  sourceIds: string[];
};

export type ResearchResult = {
  findings: ResearchFinding[];
  sources: ResearchSource[];
  overallConfidence: number;
  completedAt: string;
  providerId: AgentProviderId;
};

export type SwotAnalysis = {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
};

export type StrategyResult = {
  swot: SwotAnalysis;
  businessModel: string;
  marketSize: { tam: string; sam: string; som: string };
  icp: string;
  risks: string[];
  opportunities: string[];
  completedAt: string;
  providerId: AgentProviderId;
};

export type StrategyVerdict = 'GO' | 'HOLD' | 'PIVOT' | 'NO_GO';

export type DecisionTradeoff = {
  dimension: string;
  choice: string;
};

export type DecisionNextAction = {
  title: string;
  etaMinutes: number;
  confidenceGain: number;
  goProbabilityGain: number;
  priority: 'P0' | 'P1' | 'P2';
};

export type AgentDecisionResult = {
  verdict: StrategyVerdict;
  confidence: number;
  reasons: string[];
  missingData: string[];
  risks: string[];
  tradeoffs: DecisionTradeoff[];
  nextAction: DecisionNextAction;
  completedAt: string;
  providerId: AgentProviderId;
};

export type ExecutionHorizon = 'today' | 'week' | 'month';

export type ExecutionTask = {
  id: string;
  horizon: ExecutionHorizon;
  title: string;
  priority: 'P0' | 'P1' | 'P2';
  etaMinutes: number;
  confidenceImpact: number;
};

export type ExecutionPlan = {
  tasks: ExecutionTask[];
  completedAt: string;
  providerId: AgentProviderId;
};

export type LearningSignal = {
  signal: string;
  weight: number;
};

export type FounderMemorySnapshot = {
  lastDecision: StrategyVerdict;
  topGap: string;
  completedActions: string[];
  weekInsight: string;
};

export type GrowthMilestone = {
  id: string;
  phase: 'mvp' | 'landing' | 'marketing' | 'interview' | 'funding' | 'government';
  title: string;
  etaWeeks: number;
};

export type GrowthRoadmap = {
  milestones: GrowthMilestone[];
  providerId: AgentProviderId;
};

export type MentorProfile = {
  note: string;
  founderStrength: string;
  founderGap: string;
  coachingFocus: string;
};

export type KnowledgeRef = {
  id: string;
  category: 'market' | 'vc' | 'government' | 'framework' | 'startup_case';
  title: string;
  relevance: number;
};

export type StrategyPipelineResult = {
  runId: string;
  project: AgentProjectContext;
  plan: PlannerOutput;
  research: ResearchOutput;
  strategy: StrategyOutput;
  decision: DecisionOutput;
  execution: ExecutionOutput;
  growth: GrowthRoadmap;
  memory: FounderMemorySnapshot;
  mentor: MentorProfile;
  knowledge: KnowledgeRef[];
  learning: LearningSignal[];
  completedAt: string;
};

export type StrategyPipelineRequest = {
  project: AgentProjectContext;
  providerId?: AgentProviderId;
};
