import { describe, expect, it } from 'vitest';

import { AIProviderError, RateLimitError } from '../errors';
import { mapOpenAIError } from '../providers/openai-http';

describe('mapOpenAIError', () => {
  it('maps 401 to AIProviderError', () => {
    const error = mapOpenAIError(401, 'invalid key');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(401);
  });

  it('maps 429 to RateLimitError', () => {
    const error = mapOpenAIError(429, 'rate limited');
    expect(error).toBeInstanceOf(RateLimitError);
  });

  it('maps 500 to AIProviderError', () => {
    const error = mapOpenAIError(500, 'server error');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(500);
  });
});
