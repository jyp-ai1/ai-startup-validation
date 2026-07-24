import { isProviderConfigured, isRealAIEnabled, resolveDefaultModel } from '@repo/ai';

import type { ResearchProviderId } from '@/features/agents/research/services/research-agent-types';
import type { DecisionProviderId } from '@/features/decision/services/decision-types';

export function resolveResearchProviderId(): ResearchProviderId {
  if (isProviderConfigured('openrouter')) return 'gemini';
  return 'mock';
}

export function resolveDecisionProviderId(): DecisionProviderId {
  if (isProviderConfigured('openrouter')) return 'gemini';
  return 'mock';
}

export function getActiveChatModel(): string {
  return resolveDefaultModel('openrouter');
}

export { isRealAIEnabled, isProviderConfigured };
