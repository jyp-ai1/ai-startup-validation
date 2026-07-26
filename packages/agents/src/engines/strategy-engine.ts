import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentProjectContext, AgentProviderId, ResearchResult, StrategyResult } from '../types';

export class StrategyEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'StrategyEngine' }));
  }

  async synthesize(context: AgentProjectContext, research: ResearchResult): Promise<StrategyResult> {
    this.logInfo('StrategyEngine.synthesize', { projectId: context.projectId });
    const providers = resolveAgentProviders(this.providerId);
    return providers.strategy.synthesize(context, research);
  }
}
