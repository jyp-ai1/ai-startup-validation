import { describe, it, expect } from 'vitest';

import { ModelRegistry, DEFAULT_MODELS } from './registry';

describe('ModelRegistry', () => {
  it('registers default models', () => {
    const registry = new ModelRegistry();
    expect(registry.list().length).toBeGreaterThan(0);
  });

  it('finds model by id', () => {
    const registry = new ModelRegistry(DEFAULT_MODELS);
    const model = registry.get('gpt-4o');
    expect(model.provider).toBe('openai');
    expect(model.kind).toBe('chat');
  });

  it('filters models by provider', () => {
    const registry = new ModelRegistry(DEFAULT_MODELS);
    const openaiModels = registry.listByProvider('openai');
    expect(openaiModels.every((m) => m.provider === 'openai')).toBe(true);
  });

  it('filters models by kind', () => {
    const registry = new ModelRegistry(DEFAULT_MODELS);
    const embeddingModels = registry.listByKind('embedding');
    expect(embeddingModels.every((m) => m.kind === 'embedding')).toBe(true);
  });
});
