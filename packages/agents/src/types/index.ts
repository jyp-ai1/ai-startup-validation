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

export type {
  IntelligenceLayer,
  FounderProfileSignals,
  BusinessDelta,
  StrategicHorizon,
  LearningPattern,
  CohortInsight,
} from './intelligence';
export { INTELLIGENCE_AGENT_MAP, FOUNDER_SUCCESS_GATE } from './intelligence';

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

/** Full Decision Engine output — why → gap → how → effect → GO lift → next action */
export type DecisionIntelligence = {
  why: string;
  gap: string;
  gapSeverity: number;
  how: string;
  etaMinutes: number;
  expectedEffect: string;
  goLift: number;
  nextActionTitle: string;
};

export type AgentDecisionResult = {
  verdict: StrategyVerdict;
  confidence: number;
  reasons: string[];
  missingData: string[];
  risks: string[];
  tradeoffs: DecisionTradeoff[];
  nextAction: DecisionNextAction;
  intelligence?: DecisionIntelligence;
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
  recommendation?: string;
  ignoreRate?: number;
  successRate?: number;
};

export type MemoryGeneratedAction = {
  actionTitle: string;
  questions: string[];
  etaMinutes: number;
};

export type FounderMemorySnapshot = {
  lastDecision: StrategyVerdict;
  topGap: string;
  completedActions: string[];
  weekInsight: string;
  recallInsight?: string;
  generatedAction?: MemoryGeneratedAction;
};

export type GrowthMilestone = {
  id: string;
  phase: 'mvp' | 'landing' | 'marketing' | 'interview' | 'funding' | 'government';
  title: string;
  etaWeeks: number;
};

export type FounderGrowthMetrics = {
  successScore: number;
  successDelta: number;
  businessProgress: {
    market: number;
    customer: number;
    pricing: number;
    investment: number;
  };
  executionRate: number;
  learningRate: number;
  marketReadiness: number;
  productReadiness: number;
  fundraisingReadiness: number;
};

export type GrowthRoadmap = {
  milestones: GrowthMilestone[];
  metrics?: FounderGrowthMetrics;
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

export type BusinessDeltaJudgment = {
  id: string;
  category: 'market' | 'competitor' | 'investment' | 'government';
  change: string;
  recommendation: string;
  reason: string;
  goImpact: number;
};

export type FounderDailyReviewSnapshot = {
  scoreDelta: number;
  advances: string[];
  pending: string[];
  tomorrowFocus: string;
  totalMinutesInvested: number;
};

/** Composed Founder Daily OS — synthesized from all AI agents */
export type FounderOsBrief = {
  morningBrief: string;
  successScore: { percent: number; delta: number; reasons: string[] };
  businessProgress: Array<{ key: 'market' | 'customer' | 'pricing' | 'investment'; percent: number }>;
  todayActions: Array<{ id: string; title: string; etaMinutes: number; goImpact: number; order: number }>;
  totalEtaMinutes: number;
  businessDeltas: BusinessDeltaJudgment[];
  dailyReview: FounderDailyReviewSnapshot;
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
  founderOs?: FounderOsBrief;
  completedAt: string;
};

export type StrategyPipelineRequest = {
  project: AgentProjectContext;
  providerId?: AgentProviderId;
  /** Prior run success score — enables Growth agent delta calculation */
  previousSuccessScore?: number;
};
