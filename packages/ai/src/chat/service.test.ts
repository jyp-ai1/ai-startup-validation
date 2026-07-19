import { describe, it, expect, beforeEach } from 'vitest';

import { ChatService } from './service';
import { ProviderRegistry } from '../providers/registry';
import { OpenAIProviderAdapter } from '../providers/adapters';
import { ModelRegistry, DEFAULT_MODELS } from '../models/registry';
import { ObservabilityTracker } from '../observability/tracker';

describe('ChatService', () => {
  let chat: ChatService;
  let providers: ProviderRegistry;
  let observability: ObservabilityTracker;

  beforeEach(() => {
    providers = new ProviderRegistry();
    providers.clear();
    providers.registerFactory('openai', (c) => new OpenAIProviderAdapter(c));
    providers.create('openai', { apiKey: 'test-key' });

    observability = new ObservabilityTracker();

    chat = new ChatService({
      providers,
      models: new ModelRegistry(DEFAULT_MODELS),
      observability,
    });
  });

  it('chat() returns unified response', async () => {
    const response = await chat.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(response.provider).toBe('openai');
    expect(response.content).toContain('Hello');
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });

  it('stream() yields unified chunks', async () => {
    const chunks: string[] = [];
    for await (const chunk of chat.stream({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
    })) {
      if (chunk.delta) chunks.push(chunk.delta);
    }
    expect(chunks.join('')).toContain('Hi');
  });

  it('complete() returns completion response', async () => {
    const response = await chat.complete({
      model: 'gpt-4o',
      prompt: 'Complete this',
    });
    expect(response.text).toBeTruthy();
    expect(response.provider).toBe('openai');
  });

  it('generateJSON() parses JSON response', async () => {
    const response = await chat.generateJSON({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: '{"key":"value"}' }],
    });
    expect(response.json).toBeDefined();
  });

  it('records observability events', async () => {
    await chat.chat({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Track me' }],
    });
    expect(observability.getEvents().length).toBeGreaterThan(0);
  });
});
