import { describe, it, expect } from 'vitest';

import { TokenManager, isWithinBudget } from './manager';

describe('TokenManager', () => {
  it('estimates token count from text', () => {
    const manager = new TokenManager();
    expect(manager.estimateTokens('Hello world')).toBeGreaterThan(0);
  });

  it('estimates cost from usage', () => {
    const manager = new TokenManager();
    const cost = manager.estimateCostUsd('gpt-4o', {
      inputTokens: 1_000_000,
      outputTokens: 0,
      totalTokens: 1_000_000,
    });
    expect(cost).toBe(2.5);
  });

  it('checks token budget', () => {
    const within = isWithinBudget(
      { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      { maxInputTokens: 1000, maxOutputTokens: 500, maxTotalTokens: 1500 },
    );
    expect(within).toBe(true);
  });
});
