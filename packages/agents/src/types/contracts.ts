/**
 * Agent Layer type contracts — FROZEN pipeline I/O.
 * Engines consume/produce these types only. Provider adapters swap underneath.
 *
 * ResearchOutput → StrategyInput → StrategyOutput → DecisionInput → DecisionOutput → ExecutionOutput
 */

import type {
  AgentDecisionResult,
  AgentProjectContext,
  AgentProviderId,
  ExecutionPlan,
  ResearchDomain,
  ResearchResult,
  StrategyResult,
} from './index';

/** Phase 1 output */
export type ResearchOutput = ResearchResult;

export type PlannerResearchStep = {
  domain: ResearchDomain;
  priority: number;
  reason: string;
};

/** Planner output — sits between Research and Strategy */
export type PlannerOutput = {
  researchOrder: PlannerResearchStep[];
  missingDomains: ResearchDomain[];
  agentSequence: ReadonlyArray<
    'research' | 'planner' | 'strategy' | 'decision' | 'execution'
  >;
  rationale: string;
  completedAt: string;
  providerId: AgentProviderId;
};

/** Phase 2 input */
export type StrategyInput = {
  project: AgentProjectContext;
  research: ResearchOutput;
  plan: PlannerOutput;
};

/** Phase 2 output */
export type StrategyOutput = StrategyResult;

/** Phase 3 input */
export type DecisionInput = {
  project: AgentProjectContext;
  research: ResearchOutput;
  strategy: StrategyOutput;
  plan: PlannerOutput;
};

/** Phase 3 output */
export type DecisionOutput = AgentDecisionResult;

/** Phase 4 input */
export type ExecutionInput = {
  project: AgentProjectContext;
  decision: DecisionOutput;
  plan: PlannerOutput;
};

/** Phase 4 output */
export type ExecutionOutput = ExecutionPlan;

/** Full pipeline artifact — includes planner + intelligence layers */
export type AgentPipelineOutput = {
  runId: string;
  project: AgentProjectContext;
  plan: PlannerOutput;
  research: ResearchOutput;
  strategy: StrategyOutput;
  decision: DecisionOutput;
  execution: ExecutionOutput;
  completedAt: string;
};
