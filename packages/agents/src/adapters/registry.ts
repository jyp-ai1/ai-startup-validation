import type { AgentProviderId } from '../types';
import type {
  DecisionProviderPort,
  ExecutionProviderPort,
  GrowthProviderPort,
  KnowledgeProviderPort,
  LearningProviderPort,
  MemoryProviderPort,
  MentorProviderPort,
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
import { mockResearchProvider } from './mock/mock-research-provider';
import { mockStrategyProvider } from './mock/mock-strategy-provider';

export type AgentProviderBundle = {
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

export function resolveAgentProviders(providerId: AgentProviderId = 'mock'): AgentProviderBundle {
  if (providerId === 'mock') return MOCK_BUNDLE;
  // Phase 10 — openrouter/openai adapters plug in here without changing engines
  return MOCK_BUNDLE;
}
