import { describe, expect, it } from 'vitest';

import { AIProviderError, RateLimitError, SafetyError, TokenLimitError } from '../errors';
import type { ChatRequest, ChatResponse, ModelKind } from '../types';
import { AnthropicProviderAdapter, GoogleProviderAdapter } from './adapters';
import { BaseProviderAdapter } from './base-provider.adapter';
import {
  geminiGenerateContentUrl,
  runPreservedGeminiPasses,
} from './google-http';

const CEILING = 128;
const API_KEY = 'test-key-not-a-secret';

class StubDisabledAdapter extends BaseProviderAdapter {
  readonly id = 'google' as const;
  readonly name = 'Google Gemini';
  readonly capabilities: ModelKind[] = ['chat'];

  protected override refusesStubResponse(): boolean {
    return true;
  }
}

function chatRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    model: 'gemini-2.0-flash',
    messages: [{ role: 'user', content: '가격 가정을 검토하라' }],
    maxTokens: 64,
    ...overrides,
  };
}

function geminiBody(text: string, extras: Record<string, unknown> = {}) {
  return {
    modelVersion: 'gemini-2.0-flash-001',
    candidates: [
      {
        content: { parts: [{ text }] },
        finishReason: 'STOP',
      },
    ],
    usageMetadata: {
      promptTokenCount: 11,
      candidatesTokenCount: 7,
      totalTokenCount: 18,
    },
    ...extras,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function adapter(
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  config: { apiKey?: string; ceiling?: number } = {},
): GoogleProviderAdapter {
  return new GoogleProviderAdapter({
    apiKey: config.apiKey === undefined ? API_KEY : config.apiKey,
    maxOutputTokensCeiling: config.ceiling === undefined ? CEILING : config.ceiling,
    fetchImpl,
  });
}

describe('GoogleProviderAdapter generateContent', () => {
  it('returns a configuration error when the API key is missing and does not call fetch', async () => {
    let called = false;
    const client = new GoogleProviderAdapter({
      maxOutputTokensCeiling: CEILING,
      fetchImpl: async () => {
        called = true;
        return jsonResponse(geminiBody('should-not-run'));
      },
    });

    await expect(client.chat(chatRequest())).rejects.toMatchObject({
      statusCode: 503,
      provider: 'google',
    });
    expect(called).toBe(false);
  });

  it('sends generateContent with the API key in a header and records model and usage', async () => {
    let seenUrl = '';
    let seenInit: RequestInit | undefined;
    const client = adapter(async (url, init) => {
      seenUrl = String(url);
      seenInit = init;
      return jsonResponse(geminiBody('1차 분석 본문'));
    });

    const response = await client.chat(chatRequest());

    expect(seenUrl).toBe(geminiGenerateContentUrl('gemini-2.0-flash'));
    expect(seenUrl).not.toContain(API_KEY);
    expect(seenUrl).not.toContain('key=');
    const headers = new Headers(seenInit?.headers);
    expect(headers.get('x-goog-api-key')).toBe(API_KEY);
    expect(seenInit?.method).toBe('POST');
    const body = JSON.parse(String(seenInit?.body)) as {
      tools?: unknown;
      contents: unknown;
      generationConfig: { maxOutputTokens: number };
    };
    expect(body.tools).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(API_KEY);
    expect(JSON.stringify(body)).not.toContain('google_search');
    expect(body.generationConfig.maxOutputTokens).toBe(64);
    expect(response.content).toBe('1차 분석 본문');
    expect(response.model).toBe('gemini-2.0-flash-001');
    expect(response.provider).toBe('google');
    expect(response.usage).toEqual({ inputTokens: 11, outputTokens: 7, totalTokens: 18 });
    expect(response.usageKnown).toBe(true);
    expect(response.groundingUsed).toBe(false);
    expect(response.sourceUrls).toEqual([]);
    expect(response.costUsd).toBeNull();
    expect(response.transport).toBe('gemini-generate-content');
    expect(response.content.startsWith('[Google Gemini stub]')).toBe(false);
    expect(response.content).not.toContain('"stub":true');
  });

  it('does not invent usage when usageMetadata is absent', async () => {
    const payload = geminiBody('본문만 있음');
    delete (payload as { usageMetadata?: unknown }).usageMetadata;
    const client = adapter(async () => jsonResponse(payload));
    const response = await client.chat(chatRequest());

    expect(response.content).toBe('본문만 있음');
    expect(response.usageKnown).toBe(false);
    expect(response.costUsd).toBeNull();
  });

  it('does not record grounding metadata as sources', async () => {
    const client = adapter(async () =>
      jsonResponse(
        geminiBody('검색 없는 본문', {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://example.com/source', title: 'Example' } }],
          },
        }),
      ),
    );
    const response = await client.chat(chatRequest());
    expect(response.groundingUsed).toBe(false);
    expect(response.sourceUrls).toEqual([]);
  });

  it('maps authentication failure and server errors', async () => {
    const unauthorized = adapter(async () => jsonResponse({ error: { message: API_KEY } }, 401));
    const authError = await unauthorized.chat(chatRequest()).catch((error: unknown) => error);
    expect(authError).toBeInstanceOf(AIProviderError);
    expect(authError).toMatchObject({ statusCode: 401 });
    expect(JSON.stringify(authError)).not.toContain(API_KEY);

    const forbidden = adapter(async () => new Response('forbidden', { status: 403 }));
    await expect(forbidden.chat(chatRequest())).rejects.toMatchObject({ statusCode: 403 });

    const server = adapter(async () => new Response('unavailable', { status: 503 }));
    await expect(server.chat(chatRequest())).rejects.toMatchObject({ statusCode: 503 });

    const limited = adapter(async () => new Response('slow down', { status: 429 }));
    await expect(limited.chat(chatRequest())).rejects.toBeInstanceOf(RateLimitError);
  });

  it('maps timeout, invalid JSON, and a missing candidate', async () => {
    const timeout = new GoogleProviderAdapter({
      apiKey: API_KEY,
      maxOutputTokensCeiling: CEILING,
      requestTimeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          if (!signal) {
            reject(new Error('missing signal'));
            return;
          }
          const fail = () => reject(signal.reason ?? new DOMException('timeout', 'TimeoutError'));
          if (signal.aborted) fail();
          else signal.addEventListener('abort', fail, { once: true });
        }),
    });
    const timed = await timeout
      .chat(chatRequest())
      .catch((error: unknown) => error);
    expect(timed).toBeInstanceOf(AIProviderError);
    expect(timed).toMatchObject({ statusCode: 504 });

    const invalid = adapter(async () => new Response('not-json', { status: 200 }));
    await expect(invalid.chat(chatRequest())).rejects.toMatchObject({
      statusCode: 502,
      message: 'Gemini response was not valid JSON.',
    });

    const empty = adapter(async () => jsonResponse({ candidates: [] }));
    await expect(empty.chat(chatRequest())).rejects.toMatchObject({
      message: 'Gemini response did not include a candidate.',
    });

    const blocked = adapter(async () =>
      jsonResponse({ promptFeedback: { blockReason: 'SAFETY' }, candidates: [] }),
    );
    await expect(blocked.chat(chatRequest())).rejects.toBeInstanceOf(SafetyError);
  });

  it('refuses the network when the output ceiling is missing or exceeded', async () => {
    const previous = process.env.GOOGLE_AI_MAX_OUTPUT_TOKENS;
    delete process.env.GOOGLE_AI_MAX_OUTPUT_TOKENS;
    let called = false;
    try {
      const client = new GoogleProviderAdapter({
        apiKey: API_KEY,
        fetchImpl: async () => {
          called = true;
          return jsonResponse(geminiBody('nope'));
        },
      });
      await expect(client.chat(chatRequest())).rejects.toMatchObject({ statusCode: 503 });
      const bounded = new GoogleProviderAdapter({
        apiKey: API_KEY,
        maxOutputTokensCeiling: 32,
        fetchImpl: async () => {
          called = true;
          return jsonResponse(geminiBody('nope'));
        },
      });
      await expect(bounded.chat(chatRequest({ maxTokens: 33 }))).rejects.toBeInstanceOf(
        TokenLimitError,
      );
    } finally {
      if (previous === undefined) delete process.env.GOOGLE_AI_MAX_OUTPUT_TOKENS;
      else process.env.GOOGLE_AI_MAX_OUTPUT_TOKENS = previous;
    }
    expect(called).toBe(false);
  });

  it('does not treat the base stub as a successful Google chat', async () => {
    expect(GoogleProviderAdapter.prototype.chat).not.toBe(BaseProviderAdapter.prototype.chat);

    const disabled = new StubDisabledAdapter({ apiKey: API_KEY });
    await expect(
      disabled.chat({
        model: 'gemini-2.0-flash',
        messages: [{ role: 'user', content: 'hi' }],
      }),
    ).rejects.toMatchObject({ statusCode: 501 });

    const client = adapter(async () => jsonResponse(geminiBody('real body')));
    await expect(client.complete({ model: 'gemini-2.0-flash', prompt: 'x' })).rejects.toMatchObject({
      statusCode: 501,
    });
    await expect(client.embed({ model: 'gemini-embedding-001', input: 'x' })).rejects.toMatchObject({
      statusCode: 501,
    });

    const chunks: string[] = [];
    for await (const chunk of client.stream(chatRequest())) {
      if (chunk.delta) chunks.push(chunk.delta);
    }
    expect(chunks.join('')).toBe('real body');
    expect(chunks.join('')).not.toContain('[Google Gemini stub]');
  });

  it('keeps the first response and sends it with feedback on the second request', async () => {
    const bodies: Array<{ contents: Array<{ role: string; parts: Array<{ text: string }> }> }> = [];
    let calls = 0;
    const client = adapter(async (_url, init) => {
      calls += 1;
      bodies.push(JSON.parse(String(init?.body)));
      return jsonResponse(
        geminiBody(calls === 1 ? '1차 본문' : '2차 본문', {
          usageMetadata: {
            promptTokenCount: calls,
            candidatesTokenCount: calls + 1,
            totalTokenCount: calls * 2 + 1,
          },
        }),
      );
    });

    const preserved = await runPreservedGeminiPasses((request) => client.chat(request), {
      model: 'gemini-2.0-flash',
      maxTokens: 32,
      originalUserPrompt: '사업 가정',
      userFeedback: '가격이 빠졌다',
      requestedAt: '2026-10-27T05:00:00.000Z',
    });

    expect(calls).toBe(2);
    expect(preserved.first.content).toBe('1차 본문');
    expect(preserved.second.content).toBe('2차 본문');
    expect(preserved.first).not.toBe(preserved.second);
    expect(preserved.first.usage).toEqual({ inputTokens: 1, outputTokens: 2, totalTokens: 3 });
    expect(preserved.second.usageKnown).toBe(true);
    expect(preserved.first.liveModelCall).toBe(true);
    expect(preserved.second.groundingUsed).toBe(false);
    expect(preserved.second.sourceUrls).toEqual([]);
    expect(preserved.first.costUsd).toBeNull();
    expect(preserved.second.costUsd).toBeNull();

    const secondText = JSON.stringify(bodies[1]);
    expect(secondText).toContain('사업 가정');
    expect(secondText).toContain('1차 본문');
    expect(secondText).toContain('가격이 빠졌다');
    expect(secondText).not.toContain('google_search');
    expect(preserved.secondRequest.messages.map((message) => message.content).join('\n')).toContain(
      '1차 본문',
    );
  });

  it('refuses to store a stub response as an analysis round', async () => {
    const stub: ChatResponse = {
      id: 'stub',
      model: 'gemini-2.0-flash',
      provider: 'google',
      content: '[Google Gemini stub] hi',
      finishReason: 'stop',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      latencyMs: 1,
    };
    await expect(
      runPreservedGeminiPasses(async () => stub, {
        model: 'gemini-2.0-flash',
        maxTokens: 32,
        originalUserPrompt: '사업 가정',
        userFeedback: '가격이 빠졌다',
        requestedAt: '2026-10-27T05:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(AIProviderError);
  });

  it('strips a google/ prefix and rejects a non-Gemini model id before fetch', async () => {
    let seenUrl = '';
    const client = adapter(async (url) => {
      seenUrl = String(url);
      return jsonResponse(geminiBody('본문'));
    });
    await client.chat(chatRequest({ model: 'google/gemini-2.0-flash' }));
    expect(seenUrl).toBe(geminiGenerateContentUrl('gemini-2.0-flash'));

    let called = false;
    const rejecting = adapter(async () => {
      called = true;
      return jsonResponse(geminiBody('nope'));
    });
    await expect(rejecting.chat(chatRequest({ model: 'gpt-4o' }))).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      rejecting.chat(
        chatRequest({
          tools: [{ name: 'google_search', description: 'search', parameters: {} }],
        }),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(called).toBe(false);
  });

  it('leaves other provider adapters on their existing stub path', async () => {
    const anthropic = new AnthropicProviderAdapter({ apiKey: 'anthropic-test' });
    const response = await anthropic.chat({
      model: 'claude-sonnet-4-20250514',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(response.content).toContain('[Anthropic stub]');
  });

  it('does not run a live Gemini API call', () => {
    expect(process.env.GEMINI_LIVE_CALL_APPROVED).toBeUndefined();
  });
});
