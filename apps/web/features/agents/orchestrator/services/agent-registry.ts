import { randomUUID } from 'crypto';

import { runResearchSync } from '@/features/agents/research/services/research-agent';
import { resolveResearchProviderId } from '@/lib/ai/config';

import type {
  AgentExecutionResult,
  AgentId,
  MergedEvidenceItem,
  KnowledgeNode,
  OrchestratorContext,
  StrategyAgentWorker,
} from './orchestrator-types';

function mockCost(durationMs: number, retryCount: number): AgentExecutionResult['cost'] {
  const tokens = Math.round(800 + durationMs * 2 + Math.random() * 400);
  return {
    provider: 'mock',
    durationMs,
    estimatedTokens: tokens,
    estimatedCostUsd: Math.round(tokens * 0.000002 * 1000) / 1000,
    retryCount,
  };
}

function buildResult(
  agentId: AgentId,
  confidence: number,
  summaryKey: string,
  evidence: MergedEvidenceItem[],
  knowledge: KnowledgeNode[],
  durationMs: number,
  retryCount: number,
): AgentExecutionResult {
  return {
    agentId,
    confidence,
    evidence,
    knowledge,
    summaryKey,
    cost: mockCost(durationMs, retryCount),
  };
}

const AGENT_DEFAULTS: Record<
  AgentId,
  { confidence: number; duration: number; summaryKey: string; evidenceKey: string }
> = {
  RESEARCH: { confidence: 85, duration: 1200, summaryKey: 'summaries.research', evidenceKey: 'evidence.research' },
  MARKET: { confidence: 92, duration: 900, summaryKey: 'summaries.market', evidenceKey: 'evidence.market' },
  COMPETITOR: { confidence: 84, duration: 800, summaryKey: 'summaries.competitor', evidenceKey: 'evidence.competitor' },
  GOVERNMENT: { confidence: 79, duration: 700, summaryKey: 'summaries.government', evidenceKey: 'evidence.government' },
  TECHNOLOGY: { confidence: 88, duration: 750, summaryKey: 'summaries.technology', evidenceKey: 'evidence.technology' },
  INVESTMENT: { confidence: 81, duration: 650, summaryKey: 'summaries.investment', evidenceKey: 'evidence.investment' },
  FRAMEWORK: { confidence: 90, duration: 1100, summaryKey: 'summaries.framework', evidenceKey: 'evidence.framework' },
  VOC: { confidence: 86, duration: 600, summaryKey: 'summaries.voc', evidenceKey: 'evidence.voc' },
  DECISION: { confidence: 87, duration: 500, summaryKey: 'summaries.decision', evidenceKey: 'evidence.decision' },
};

function createMockWorker(agentId: AgentId): StrategyAgentWorker {
  const defaults = AGENT_DEFAULTS[agentId];
  return {
    id: agentId,
    nameKey: `agents.${agentId.toLowerCase()}`,
    capabilityKey: `capabilities.${agentId.toLowerCase()}`,
    priority: agentId === 'DECISION' ? 10 : 5,
    estimatedDurationMs: defaults.duration,
    async execute(ctx: OrchestratorContext): Promise<AgentExecutionResult> {
      if (agentId === 'DECISION') {
        return buildResult(agentId, defaults.confidence, defaults.summaryKey, [], [], defaults.duration, 0);
      }

      const marketConf = ctx.priorResults.get('MARKET')?.confidence ?? 0;
      const priorBoost = marketConf > 80 ? 3 : 0;
      const confidence = Math.min(98, defaults.confidence + priorBoost);

      const evidence: MergedEvidenceItem[] = [
        {
          id: randomUUID(),
          agentId,
          titleKey: `${defaults.evidenceKey}.title`,
          summaryKey: `${defaults.evidenceKey}.summary`,
          confidence,
          sourceAgent: agentId,
        },
      ];

      const knowledge: KnowledgeNode[] = [
        {
          id: randomUUID(),
          agentId,
          labelKey: `${defaults.evidenceKey}.knowledge`,
          valueKey: defaults.summaryKey,
          confidence,
          relatedAgents: agentId === 'FRAMEWORK' ? ['MARKET', 'COMPETITOR'] : [agentId],
        },
      ];

      if (agentId === 'FRAMEWORK' && ctx.priorResults.has('MARKET')) {
        knowledge.push({
          id: randomUUID(),
          agentId: 'MARKET',
          labelKey: 'knowledge.crossRef',
          valueKey: 'summaries.crossMarketFramework',
          confidence: ctx.priorResults.get('MARKET')!.confidence,
          relatedAgents: ['MARKET', 'FRAMEWORK'],
        });
      }

      return buildResult(
        agentId,
        confidence,
        defaults.summaryKey,
        evidence,
        knowledge,
        defaults.duration,
        0,
      );
    },
  };
}

function createResearchWorker(): StrategyAgentWorker {
  const defaults = AGENT_DEFAULTS.RESEARCH;
  const mockWorker = createMockWorker('RESEARCH');

  return {
    id: 'RESEARCH',
    nameKey: 'agents.research',
    capabilityKey: 'capabilities.research',
    priority: 5,
    estimatedDurationMs: defaults.duration,
    async execute(ctx: OrchestratorContext): Promise<AgentExecutionResult> {
      if (resolveResearchProviderId() === 'mock') {
        return mockWorker.execute(ctx);
      }
      return runResearchSync(ctx);
    },
  };
}

const AGENT_IDS: AgentId[] = [
  'RESEARCH',
  'MARKET',
  'COMPETITOR',
  'GOVERNMENT',
  'TECHNOLOGY',
  'INVESTMENT',
  'FRAMEWORK',
  'VOC',
  'DECISION',
];

const WORKERS: StrategyAgentWorker[] = AGENT_IDS.map((agentId) =>
  agentId === 'RESEARCH' ? createResearchWorker() : createMockWorker(agentId),
);

const REGISTRY = new Map<AgentId, StrategyAgentWorker>(
  WORKERS.map((w) => [w.id, w]),
);

export function getAgentRegistry(): StrategyAgentWorker[] {
  return [...REGISTRY.values()];
}

export function getAgentWorker(id: AgentId): StrategyAgentWorker | undefined {
  return REGISTRY.get(id);
}
