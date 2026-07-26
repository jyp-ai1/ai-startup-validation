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

export interface ResearchProviderPort {
  readonly id: AgentProviderId;
  research(context: AgentProjectContext): Promise<ResearchResult>;
}

export interface StrategyProviderPort {
  readonly id: AgentProviderId;
  synthesize(context: AgentProjectContext, research: ResearchResult): Promise<StrategyResult>;
}

export interface DecisionProviderPort {
  readonly id: AgentProviderId;
  decide(
    context: AgentProjectContext,
    research: ResearchResult,
    strategy: StrategyResult,
  ): Promise<AgentDecisionResult>;
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
