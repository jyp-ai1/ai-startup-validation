import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

/** AI platform environment — optional until providers are configured. */
export const aiEnv = createEnv({
  server: {
    OPENAI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_AI_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().url().optional(),
    OLLAMA_BASE_URL: z.string().url().optional(),
    AI_DEFAULT_PROVIDER: z
      .enum(['openai', 'anthropic', 'google', 'openrouter', 'azure-openai', 'ollama'])
      .optional(),
    AI_DEFAULT_MODEL: z.string().optional(),
    /** Preferred provider alias: OPENAI | CLAUDE (maps to openai | anthropic). */
    AI_PROVIDER: z.enum(['OPENAI', 'CLAUDE', 'openai', 'anthropic']).optional(),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type AiEnv = typeof aiEnv;

export function isProviderConfigured(
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'azure-openai' | 'ollama',
): boolean {
  switch (provider) {
    case 'openai':
      return Boolean(aiEnv.OPENAI_API_KEY);
    case 'anthropic':
      return Boolean(aiEnv.ANTHROPIC_API_KEY);
    case 'google':
      return Boolean(aiEnv.GOOGLE_AI_API_KEY);
    case 'openrouter':
      return Boolean(aiEnv.OPENROUTER_API_KEY);
    case 'azure-openai':
      return Boolean(aiEnv.AZURE_OPENAI_API_KEY && aiEnv.AZURE_OPENAI_ENDPOINT);
    case 'ollama':
      return Boolean(aiEnv.OLLAMA_BASE_URL);
    default:
      return false;
  }
}
