import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentProjectContext, AgentProviderId, ResearchResult } from '../types';

export class ResearchEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'ResearchEngine' }));
  }

  async run(context: AgentProjectContext): Promise<ResearchResult> {
    this.logInfo('ResearchEngine.run', { projectId: context.projectId, providerId: this.providerId });
    const providers = resolveAgentProviders(this.providerId);
    return providers.research.research(context);
  }
}
