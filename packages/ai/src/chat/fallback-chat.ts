import {
  DEFAULT_OPENAI_MINI_MODEL,
  resolveFallbackModel,
} from '../config/defaults';
import { aiEnv, isProviderConfigured } from '../env/env';
import { AIProviderError, RateLimitError } from '../errors';
import { openAIChat } from '../providers/openai-http';
import type { ChatRequest, ChatResponse } from '../types';

function isRetryableProviderError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;
  if (error instanceof AIProviderError) {
    return error.statusCode === 429 || error.statusCode >= 500;
  }
  return false;
}

/**
 * Primary chat via configured provider; on OpenRouter failure fall back to OpenAI gpt-4o-mini (L3.2).
 */
export async function chatWithFallback(
  primaryChat: (request: ChatRequest) => Promise<ChatResponse>,
  request: ChatRequest,
): Promise<ChatResponse> {
  try {
    return await primaryChat(request);
  } catch (error) {
    if (!isRetryableProviderError(error) || !isProviderConfigured('openai') || !aiEnv.OPENAI_API_KEY) {
      throw error;
    }

    const fallbackModel = resolveFallbackModel();
    const fallbackRequest: ChatRequest = { ...request, model: fallbackModel };

    const response = await openAIChat(aiEnv.OPENAI_API_KEY, fallbackRequest);

    return {
      ...response,
      model: fallbackModel,
      provider: 'openai',
      latencyMs: response.latencyMs,
      usage: response.usage,
    };
  }
}

export { DEFAULT_OPENAI_MINI_MODEL };
