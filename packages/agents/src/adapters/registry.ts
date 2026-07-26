import type { AgentProviderId } from '../types';
import type {
  DecisionProviderPort,
  ExecutionProviderPort,
  GrowthProviderPort,
  KnowledgeProviderPort,
  LearningProviderPort,
  MemoryProviderPort,
  MentorProviderPort,
  PlannerProviderPort,
  ResearchProviderPort,
  StrategyProviderPort,
} from '../ports';
import { mockDecisionProvider } from './mock/mock-decision-provider';
import { mockExecutionProvider } from './mock/mock-execution-provider';
import {
  mockGrowthProvider,
  mockKnowledgeProvider,
  mockLearningProvider,
  mockMemoryProvider,
  mockMentorProvider,
} from './mock/mock-intelligence-providers';
import { mockPlannerProvider } from './mock/mock-planner-provider';
import { mockResearchProvider } from './mock/mock-research-provider';
import { openRouterResearchProvider } from './openrouter/openrouter-research-provider';
import { mockStrategyProvider } from './mock/mock-strategy-provider';

export type AgentProviderBundle = {
  planner: PlannerProviderPort;
  research: ResearchProviderPort;
  strategy: StrategyProviderPort;
  decision: DecisionProviderPort;
  execution: ExecutionProviderPort;
  growth: GrowthProviderPort;
  memory: MemoryProviderPort;
  mentor: MentorProviderPort;
  knowledge: KnowledgeProviderPort;
  learning: LearningProviderPort;
};

const MOCK_BUNDLE: AgentProviderBundle = {
  planner: mockPlannerProvider,
  research: mockResearchProvider,
  strategy: mockStrategyProvider,
  decision: mockDecisionProvider,
  execution: mockExecutionProvider,
  growth: mockGrowthProvider,
  memory: mockMemoryProvider,
  mentor: mockMentorProvider,
  knowledge: mockKnowledgeProvider,
  learning: mockLearningProvider,
};

/** P2 — swap provider tier without changing engines. Research uses OpenRouter when configured. */
export function resolveAgentProviders(providerId: AgentProviderId = 'mock'): AgentProviderBundle {
  switch (providerId) {
    case 'mock':
      return MOCK_BUNDLE;
    case 'openrouter':
      return {
        ...MOCK_BUNDLE,
        research: openRouterResearchProvider,
      };
    case 'rag':
    case 'hybrid':
    case 'openai':
    case 'anthropic':
      return {
        ...MOCK_BUNDLE,
        research: openRouterResearchProvider,
      };
    default:
      return MOCK_BUNDLE;
  }
}
