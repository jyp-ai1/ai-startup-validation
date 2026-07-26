import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentProjectContext, AgentProviderId } from '../types';
import type { ResearchOutput, StrategyInput, StrategyOutput } from '../types/contracts';

export class StrategyEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'StrategyEngine' }));
  }

  async synthesize(input: StrategyInput): Promise<StrategyOutput> {
    this.logInfo('StrategyEngine.synthesize', { projectId: input.project.projectId });
    const providers = resolveAgentProviders(this.providerId);
    return providers.strategy.synthesize(input);
  }

  /** @deprecated Use synthesize(StrategyInput) */
  async synthesizeLegacy(
    context: AgentProjectContext,
    research: ResearchOutput,
  ): Promise<StrategyOutput> {
    const providers = resolveAgentProviders(this.providerId);
    const plan = await providers.planner.plan(context, research);
    return this.synthesize({ project: context, research, plan });
  }
}
