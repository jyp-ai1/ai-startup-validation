import type { DecisionInput, DecisionProviderId, DecisionResult } from './decision-types';
import { getDecisionProvider } from './providers';

export type DecisionEngineOptions = {
  providerId?: DecisionProviderId;
};

/**
 * DecisionService — swappable provider orchestration.
 * UI and routes depend on this service, not on Mock or LLM implementations.
 */
export class DecisionService {
  private readonly providerId: DecisionProviderId;

  constructor(options: DecisionEngineOptions = {}) {
    this.providerId = options.providerId ?? 'mock';
  }

  async generateDecision(input: DecisionInput): Promise<DecisionResult> {
    const provider = getDecisionProvider(this.providerId);
    return provider.generate(input);
  }
}

export const decisionService = new DecisionService({ providerId: 'mock' });
