import { describe, it, expect, beforeEach } from 'vitest';

import { ProviderRegistry } from './registry';
import { OpenAIProviderAdapter } from './adapters';

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
    registry.clear();
    registry.registerFactory('openai', (c) => new OpenAIProviderAdapter(c));
  });

  it('registers and retrieves providers dynamically', () => {
    const provider = registry.create('openai', { apiKey: 'test-key' });
    expect(provider.id).toBe('openai');
    expect(registry.has('openai')).toBe(true);
  });

  it('lazy-creates provider from factory on get()', () => {
    const provider = registry.get('openai');
    expect(provider.name).toBe('OpenAI');
  });

  it('lists registered provider ids', () => {
    registry.create('openai', { apiKey: 'test' });
    expect(registry.listIds()).toContain('openai');
  });
});
