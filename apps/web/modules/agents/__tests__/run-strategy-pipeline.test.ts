import { afterEach, describe, expect, it, vi } from 'vitest';

import { runStrategyPipeline } from '@/lib/agents/run-strategy-pipeline';

const body = {
  projectId: 'proj-test',
  projectTitle: 'LaunchLens',
  ideaSummary: 'AI PM for founders',
  goalId: 'business-viability',
  locale: 'ko',
};

describe('runStrategyPipeline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns success on first attempt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: { runId: 'run-1', decision: { verdict: 'HOLD' } },
        }),
      }),
    );

    const result = await runStrategyPipeline(body, { timeoutMs: 5000, maxAttempts: 1 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.runId).toBe('run-1');
      expect(result.attempts).toBe(1);
    }
  });

  it('retries after timeout then succeeds', async () => {
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() => {
        calls += 1;
        if (calls === 1) {
          return Promise.reject(new DOMException('Aborted', 'AbortError'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { runId: 'run-2' } }),
        });
      }),
    );

    const retries: number[] = [];
    const result = await runStrategyPipeline(body, {
      timeoutMs: 5000,
      maxAttempts: 3,
      onRetry: (attempt) => retries.push(attempt),
    });

    expect(result.ok).toBe(true);
    expect(retries).toEqual([1]);
  });

  it('returns failure after max attempts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('Network error')),
    );

    const result = await runStrategyPipeline(body, {
      timeoutMs: 1000,
      maxAttempts: 2,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.attempts).toBe(2);
      expect(result.error).toContain('Network error');
    }
  });
});
