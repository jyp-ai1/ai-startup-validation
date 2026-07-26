import { describe, expect, it } from 'vitest';

import { resolveAgentProviders } from './registry';

describe('resolveAgentProviders', () => {
  it('keeps mock bundle for mock provider', () => {
    const bundle = resolveAgentProviders('mock');
    expect(bundle.research.id).toBe('mock');
    expect(bundle.strategy.id).toBe('mock');
  });

  it('swaps only research to openrouter tier while strategy stays mock', () => {
    const bundle = resolveAgentProviders('openrouter');
    expect(bundle.research.id).toBe('openrouter');
    expect(bundle.strategy.id).toBe('mock');
    expect(bundle.decision.id).toBe('mock');
  });
});
