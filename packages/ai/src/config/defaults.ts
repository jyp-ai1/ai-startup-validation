import { aiEnv, isProviderConfigured } from '../env/env';
import type { ProviderId } from '../types';

/** Primary MVP model — Gemini Flash via OpenRouter. */
export const DEFAULT_GEMINI_FLASH_MODEL = 'google/gemini-2.5-flash';

export function resolveDefaultProvider(): ProviderId {
  if (aiEnv.AI_DEFAULT_PROVIDER) return aiEnv.AI_DEFAULT_PROVIDER;
  if (isProviderConfigured('openrouter')) return 'openrouter';
  if (isProviderConfigured('google')) return 'google';
  if (isProviderConfigured('openai')) return 'openai';
  if (isProviderConfigured('anthropic')) return 'anthropic';
  return 'openrouter';
}

export function resolveDefaultModel(provider: ProviderId = resolveDefaultProvider()): string {
  if (aiEnv.AI_DEFAULT_MODEL) return aiEnv.AI_DEFAULT_MODEL;

  switch (provider) {
    case 'openrouter':
    case 'google':
      return DEFAULT_GEMINI_FLASH_MODEL;
    case 'openai':
      return 'gpt-4o-mini';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    default:
      return DEFAULT_GEMINI_FLASH_MODEL;
  }
}

export function isRealAIEnabled(): boolean {
  return isProviderConfigured('openrouter') || isProviderConfigured('openai') || isProviderConfigured('anthropic');
}
