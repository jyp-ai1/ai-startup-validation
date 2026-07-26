import { Logger } from '@repo/core/logger';
import { BaseService } from '@repo/core/service';

import { resolveAgentProviders } from '../adapters/registry';
import type { AgentDecisionResult, AgentProjectContext, AgentProviderId, ExecutionPlan } from '../types';

export class ExecutionEngine extends BaseService {
  constructor(private readonly providerId: AgentProviderId = 'mock') {
    super(new Logger({ namespace: 'ExecutionEngine' }));
  }

  async plan(context: AgentProjectContext, decision: AgentDecisionResult): Promise<ExecutionPlan> {
    this.logInfo('ExecutionEngine.plan', { projectId: context.projectId, verdict: decision.verdict });
    const providers = resolveAgentProviders(this.providerId);
    return providers.execution.plan(context, decision);
  }
}
