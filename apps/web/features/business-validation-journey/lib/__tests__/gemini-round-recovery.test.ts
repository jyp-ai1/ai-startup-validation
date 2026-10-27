import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { GoogleProviderAdapter } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  decideGeminiLiveCall,
  GEMINI_RECOVERY_PATH,
  recoverGeminiRound,
  reopenGeminiRound,
} from '../gemini-round-recovery';
import { openGeminiRoundStore } from '../gemini-round-store';

const NOW = '2026-10-27T05:10:00.000Z';

function storePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'gemini-rounds-')), 'rounds.sqlite');
}

function geminiBody(text: string) {
  return {
    modelVersion: 'gemini-2.0-flash-001',
    candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }],
    usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 6, totalTokenCount: 10 },
  };
}

function adapter(fetchImpl: (input: string | URL, init?: RequestInit) => Promise<Response>) {
  return new GoogleProviderAdapter({
    apiKey: 'test-key',
    maxOutputTokensCeiling: 64,
    fetchImpl,
  });
}

describe('Gemini round recovery', () => {
  it('stores an injected HTTP original and reads it from a reopened file', async () => {
    const path = storePath();
    const store = openGeminiRoundStore(path);
    const seen: string[] = [];
    const client = adapter(async (url, init) => {
      seen.push(String(url));
      expect(String(init?.body)).toContain('도시락');
      expect(String(init?.body)).not.toContain('google_search');
      return Response.json(geminiBody('1차 원문 https://example.com/not-a-source'));
    });
    const result = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'exec-1',
      round: 1,
      business: '도시락 구독',
      customer: '직장인',
      problem: '점심 선택',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat: (request) => client.chat(request),
    });
    store.close();

    expect(result.called).toBe(true);
    expect(result.record.status).toBe('succeeded');
    expect(result.record.evidence).toBe('injected_http');
    expect(result.record.content).toBe('1차 원문 https://example.com/not-a-source');
    expect(result.record.model).toBe('gemini-2.0-flash-001');
    expect(result.record.sourceUrls).toEqual([]);
    expect(result.record.sourceStatus).toBe('absent');
    expect(result.record.groundingUsed).toBe(false);
    expect(result.record.costUsd).toBeNull();
    expect(result.record.verifiedFact).toBe(false);
    expect(seen[0]).toContain(':generateContent');

    const reopened = reopenGeminiRound(path, 'user-a', 'exec-1');
    expect(reopened?.content).toBe(result.record.content);
    expect(reopenGeminiRound(path, 'user-b', 'exec-1')).toBeNull();
  });

  it('keeps round 1 and sends it with feedback on round 2', async () => {
    const path = storePath();
    const store = openGeminiRoundStore(path);
    const bodies: string[] = [];
    let n = 0;
    const client = adapter(async (_url, init) => {
      n += 1;
      bodies.push(String(init?.body));
      return Response.json(geminiBody(n === 1 ? '1차 원문' : '2차 원문'));
    });
    const chat = (request: Parameters<typeof client.chat>[0]) => client.chat(request);
    const first = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'exec-1',
      round: 1,
      business: '도시락 구독',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    const second = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'exec-2',
      round: 2,
      business: '도시락 구독',
      feedback: '가격이 빠졌다',
      parentExecutionId: 'exec-1',
      now: '2026-10-27T05:11:00.000Z',
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    store.close();

    expect(first.record.content).toBe('1차 원문');
    expect(second.record.content).toBe('2차 원문');
    expect(second.record.parentExecutionId).toBe('exec-1');
    expect(bodies[1]).toContain('1차 원문');
    expect(bodies[1]).toContain('가격이 빠졌다');
    const again = openGeminiRoundStore(path);
    expect(again.list('user-a').map((record) => record.content)).toEqual(['1차 원문', '2차 원문']);
    again.close();
  });

  it('does not send a live call when approval or the key is missing', async () => {
    expect(decideGeminiLiveCall({})).toMatchObject({ evidence: 'not_run' });
    expect(decideGeminiLiveCall({ GEMINI_LIVE_CALL_APPROVED: 'yes' })).toMatchObject({ evidence: 'not_run' });
    expect(process.env.GEMINI_LIVE_CALL_APPROVED).toBeUndefined();

    const store = openGeminiRoundStore(storePath());
    let called = false;
    const result = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'exec-missing',
      round: 1,
      business: '도시락 구독',
      now: NOW,
      maxTokens: 32,
      evidence: 'not_run',
      notRunReason: 'Gemini live call is not approved. No request was sent.',
      chat: async () => {
        called = true;
        throw new Error('should not run');
      },
    });
    store.close();
    expect(called).toBe(false);
    expect(result.record.status).toBe('not_run');
    expect(result.record.content).toBeNull();
  });

  it('records auth failure, timeout, empty text, and a refused stub', async () => {
    const path = storePath();
    const store = openGeminiRoundStore(path);
    const unauthorized = adapter(async () => new Response('no', { status: 401 }));
    const auth = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'auth',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat: (request) => unauthorized.chat(request),
    });
    expect(auth.record.status).toBe('failed');
    expect(auth.record.httpStatus).toBe(401);
    expect(auth.record.content).toBeNull();

    const timeout = new GoogleProviderAdapter({
      apiKey: 'test-key',
      maxOutputTokensCeiling: 64,
      requestTimeoutMs: 20,
      fetchImpl: (_url, init) =>
        new Promise((_resolve, reject) => {
          const signal = init?.signal;
          const fail = () => reject(signal?.reason ?? new DOMException('timeout', 'TimeoutError'));
          if (!signal) {
            reject(new Error('missing signal'));
            return;
          }
          if (signal.aborted) fail();
          else signal.addEventListener('abort', fail, { once: true });
        }),
    });
    const timed = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'timeout',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat: (request) => timeout.chat(request),
    });
    expect(timed.record.httpStatus).toBe(504);
    expect(timed.record.content).toBeNull();

    const empty = adapter(async () => Response.json(geminiBody('   ')));
    const missing = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'empty',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat: (request) => empty.chat(request),
    });
    expect(missing.record.status).toBe('result_missing');
    expect(missing.record.content).toBeNull();

    const stub = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'stub',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat: async () => ({
        id: 'stub',
        model: 'gemini-2.0-flash',
        provider: 'google',
        content: '[Google Gemini stub] hi',
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        latencyMs: 1,
      }),
    });
    expect(stub.record.status).toBe('failed');
    expect(stub.record.content).toBeNull();
    expect(stub.record.error).toContain('Stub');
    store.close();
  });

  it('does not call twice for the same execution id and does not send round 2 after a failed round 1', async () => {
    const store = openGeminiRoundStore(storePath());
    let calls = 0;
    const client = adapter(async () => {
      calls += 1;
      return Response.json(geminiBody('1차 원문'));
    });
    const chat = (request: Parameters<typeof client.chat>[0]) => client.chat(request);
    await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'same',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    const duplicate = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'same',
      round: 1,
      business: '다른 사업',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.called).toBe(false);
    expect(duplicate.record.content).toBe('1차 원문');
    expect(calls).toBe(1);

    const failedParent = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'bad',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'not_run',
      notRunReason: 'not approved',
    });
    const follow = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'bad-2',
      round: 2,
      business: '도시락',
      feedback: '가격',
      parentExecutionId: failedParent.record.executionId,
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    expect(follow.called).toBe(false);
    expect(follow.record.status).toBe('failed');
    expect(calls).toBe(1);
    store.close();
  });

  it('keeps a saved round 1 when round 2 fails', async () => {
    const path = storePath();
    const store = openGeminiRoundStore(path);
    let n = 0;
    const client = adapter(async () => {
      n += 1;
      if (n === 1) return Response.json(geminiBody('1차 원문'));
      return new Response('down', { status: 503 });
    });
    const chat = (request: Parameters<typeof client.chat>[0]) => client.chat(request);
    await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'ok',
      round: 1,
      business: '도시락',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    const second = await recoverGeminiRound({
      store,
      userId: 'user-a',
      executionId: 'partial',
      round: 2,
      business: '도시락',
      feedback: '가격',
      parentExecutionId: 'ok',
      now: NOW,
      maxTokens: 32,
      evidence: 'injected_http',
      chat,
    });
    store.close();
    expect(second.record.status).toBe('failed');
    expect(second.record.httpStatus).toBe(503);
    expect(reopenGeminiRound(path, 'user-a', 'ok')?.content).toBe('1차 원문');
    expect(reopenGeminiRound(path, 'user-a', 'partial')?.content).toBeNull();
  });

  it('records that the bookmark and extension do not return a Gemini reply', () => {
    expect(GEMINI_RECOVERY_PATH.selected).toBe('official_generate_content');
    expect(GEMINI_RECOVERY_PATH.bookmarkReturnsReply).toBe(false);
    expect(GEMINI_RECOVERY_PATH.extensionReturnsReply).toBe(false);
    expect(GEMINI_RECOVERY_PATH.readsGeminiPage).toBe(false);
  });
});
