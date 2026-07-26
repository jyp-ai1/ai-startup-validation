import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentProviderId } from '../types';
import type { DecisionInput, DecisionOutput } from '../types/contracts';

export class DecisionEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'DecisionEngine' }));
  }

  async decide(input: DecisionInput): Promise<DecisionOutput> {
    this.logInfo('DecisionEngine.decide', { projectId: input.project.projectId });
    const providers = resolveAgentProviders(this.providerId);
    return providers.decision.decide(input);
  }
}
