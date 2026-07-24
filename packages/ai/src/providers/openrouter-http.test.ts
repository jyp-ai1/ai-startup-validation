import { describe, expect, it } from 'vitest';

import { AIProviderError, RateLimitError } from '../errors';
import { mapOpenRouterError } from '../providers/openrouter-http';

describe('mapOpenRouterError', () => {
  it('maps 401 to AIProviderError', () => {
    const error = mapOpenRouterError(401, 'invalid key');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(401);
  });

  it('maps 429 to RateLimitError', () => {
    const error = mapOpenRouterError(429, 'rate limited');
    expect(error).toBeInstanceOf(RateLimitError);
  });

  it('maps 500 to AIProviderError', () => {
    const error = mapOpenRouterError(500, 'server error');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(500);
  });
});
