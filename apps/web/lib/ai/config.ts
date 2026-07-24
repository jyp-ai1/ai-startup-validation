import { isProviderConfigured, isRealAIEnabled, resolveDefaultModel } from '@repo/ai';

import type { ResearchProviderId } from '@/features/agents/research/services/research-agent-types';

export function resolveResearchProviderId(): ResearchProviderId {
  if (isProviderConfigured('openrouter')) return 'gemini';
  return 'mock';
}

export function getActiveChatModel(): string {
  return resolveDefaultModel('openrouter');
}

export { isRealAIEnabled, isProviderConfigured };
