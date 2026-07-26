import type {
  AgentDecisionResult,
  AgentProjectContext,
  AgentProviderId,
  ExecutionPlan,
  GrowthRoadmap,
  KnowledgeRef,
  LearningSignal,
  FounderMemorySnapshot,
  MentorProfile,
  ResearchResult,
  StrategyResult,
} from '../types';
import type {
  DecisionInput,
  PlannerOutput,
  ResearchOutput,
  StrategyInput,
  StrategyOutput,
} from '../types/contracts';

export interface PlannerProviderPort {
  readonly id: AgentProviderId;
  plan(context: AgentProjectContext, research: ResearchOutput): Promise<PlannerOutput>;
}

export interface ResearchProviderPort {
  readonly id: AgentProviderId;
  research(context: AgentProjectContext): Promise<ResearchResult>;
}

export interface StrategyProviderPort {
  readonly id: AgentProviderId;
  synthesize(input: StrategyInput): Promise<StrategyResult>;
}

export interface DecisionProviderPort {
  readonly id: AgentProviderId;
  decide(input: DecisionInput): Promise<AgentDecisionResult>;
}

export interface ExecutionProviderPort {
  readonly id: AgentProviderId;
  plan(
    context: AgentProjectContext,
    decision: AgentDecisionResult,
  ): Promise<ExecutionPlan>;
}

export interface GrowthProviderPort {
  readonly id: AgentProviderId;
  roadmap(context: AgentProjectContext, decision: AgentDecisionResult): Promise<GrowthRoadmap>;
}

export interface MemoryProviderPort {
  readonly id: AgentProviderId;
  snapshot(
    context: AgentProjectContext,
    decision: AgentDecisionResult,
  ): Promise<FounderMemorySnapshot>;
}

export interface MentorProviderPort {
  readonly id: AgentProviderId;
  coach(context: AgentProjectContext, decision: AgentDecisionResult): Promise<MentorProfile>;
}

export interface KnowledgeProviderPort {
  readonly id: AgentProviderId;
  retrieve(context: AgentProjectContext, research: ResearchResult): Promise<KnowledgeRef[]>;
}

export interface LearningProviderPort {
  readonly id: AgentProviderId;
  extract(
    context: AgentProjectContext,
    decision: AgentDecisionResult,
  ): Promise<LearningSignal[]>;
}
