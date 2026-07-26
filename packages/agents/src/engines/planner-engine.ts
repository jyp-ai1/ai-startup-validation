import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentProjectContext } from '../types';
import type { PlannerOutput, ResearchOutput } from '../types/contracts';

export class PlannerEngine extends BaseService {
  constructor(private readonly providerId: Parameters<typeof resolveAgentProviders>[0] = 'mock') {
    super(new Logger({ namespace: 'PlannerEngine' }));
  }

  async plan(context: AgentProjectContext, research: ResearchOutput): Promise<PlannerOutput> {
    this.logInfo('PlannerEngine.plan', {
      projectId: context.projectId,
      findingCount: research.findings.length,
    });
    const providers = resolveAgentProviders(this.providerId);
    return providers.planner.plan(context, research);
  }
}
