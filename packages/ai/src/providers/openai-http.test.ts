import { describe, expect, it } from 'vitest';

import { AIProviderError, RateLimitError } from '../errors';
import { mapOpenAIError, openAIResponseFormat } from '../providers/openai-http';
import type { ChatRequest } from '../types';

describe('openAIResponseFormat', () => {
  const request = (responseFormat: ChatRequest['responseFormat']): ChatRequest => ({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'ping' }],
    responseFormat,
  });

  it('sends strict json_schema and drops the title keyword', () => {
    expect(
      openAIResponseFormat(
        request({
          type: 'json_schema',
          schema: {
            title: 'reflection_output_11',
            type: 'object',
            additionalProperties: false,
            required: ['judgment'],
            properties: { judgment: { type: 'string' } },
          },
        }),
      ),
    ).toEqual({
      type: 'json_schema',
      json_schema: {
        name: 'reflection_output_11',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          required: ['judgment'],
          properties: { judgment: { type: 'string' } },
        },
      },
    });
  });

  it('keeps json_object for the first review', () => {
    expect(openAIResponseFormat(request({ type: 'json_object' }))).toEqual({ type: 'json_object' });
  });
});

describe('mapOpenAIError', () => {
  it('maps 401 to AIProviderError', () => {
    const error = mapOpenAIError(401, 'invalid key');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(401);
  });

  it('maps 429 to RateLimitError', () => {
    const error = mapOpenAIError(429, 'rate limited');
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toContain('provider_http=429');
    expect(error.message).not.toContain('rate limited');
  });

  it('keeps the provider error code and rate-limit headers without the raw secret', () => {
    const headers = new Headers({
      'retry-after': '12',
      'x-request-id': 'req_test_429',
      'x-ratelimit-remaining-requests': '0',
      authorization: 'Bearer sk-secret-value',
    });
    const error = mapOpenAIError(
      429,
      JSON.stringify({
        error: {
          type: 'insufficient_quota',
          code: 'insufficient_quota',
          message: 'quota exceeded for sk-secret-value',
        },
      }),
      headers,
    );
    expect(error).toBeInstanceOf(RateLimitError);
    expect(error.message).toContain('code=insufficient_quota');
    expect(error.message).toContain('type=insufficient_quota');
    expect(error.message).toContain('request_id=req_test_429');
    expect(error.message).toContain('retry_after=12');
    expect(error.message).toContain('x-ratelimit-remaining-requests=0');
    expect(error.message).toContain('[redacted]');
    expect(error.message).not.toContain('sk-secret-value');
    expect(error.message).not.toContain('Bearer');
    expect((error as RateLimitError).retryAfterMs).toBe(12_000);
  });

  it('maps 500 to AIProviderError', () => {
    const error = mapOpenAIError(500, 'server error');
    expect(error).toBeInstanceOf(AIProviderError);
    expect((error as AIProviderError).statusCode).toBe(500);
  });
});
