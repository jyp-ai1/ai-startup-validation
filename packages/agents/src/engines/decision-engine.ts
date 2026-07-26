import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type {
  AgentDecisionResult,
  AgentProjectContext,
  AgentProviderId,
  ResearchResult,
  StrategyResult,
} from '../types';

export class DecisionEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'DecisionEngine' }));
  }

  async decide(
    context: AgentProjectContext,
    research: ResearchResult,
    strategy: StrategyResult,
  ): Promise<AgentDecisionResult> {
    this.logInfo('DecisionEngine.decide', { projectId: context.projectId });
    const providers = resolveAgentProviders(this.providerId);
    return providers.decision.decide(context, research, strategy);
  }
}
