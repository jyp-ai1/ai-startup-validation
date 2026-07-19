import type { ProviderConfig, ProviderId } from '../types';
import { ProviderNotRegisteredError } from '../errors';
import type { AIProviderPort, ProviderFactory } from './provider.port';
import {
  AnthropicProviderAdapter,
  AzureOpenAIProviderAdapter,
  GoogleProviderAdapter,
  OllamaProviderAdapter,
  OpenAIProviderAdapter,
  OpenRouterProviderAdapter,
} from './adapters';

/** Dynamic provider registry — register/unregister at runtime. */
export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, AIProviderPort>();
  private readonly factories = new Map<ProviderId, ProviderFactory>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.registerFactory('openai', (c) => new OpenAIProviderAdapter(c));
    this.registerFactory('anthropic', (c) => new AnthropicProviderAdapter(c));
    this.registerFactory('google', (c) => new GoogleProviderAdapter(c));
    this.registerFactory('openrouter', (c) => new OpenRouterProviderAdapter(c));
    this.registerFactory('azure-openai', (c) => new AzureOpenAIProviderAdapter(c));
    this.registerFactory('ollama', (c) => new OllamaProviderAdapter(c));
  }

  registerFactory(id: ProviderId, factory: ProviderFactory): void {
    this.factories.set(id, factory);
  }

  register(provider: AIProviderPort): void {
    this.providers.set(provider.id, provider);
  }

  create(id: ProviderId, config?: ProviderConfig): AIProviderPort {
    const factory = this.factories.get(id);
    if (!factory) {
      throw new ProviderNotRegisteredError(id);
    }
    const provider = factory(config);
    this.providers.set(id, provider);
    return provider;
  }

  get(id: ProviderId): AIProviderPort {
    const existing = this.providers.get(id);
    if (existing) return existing;

    const factory = this.factories.get(id);
    if (factory) {
      return this.create(id);
    }

    throw new ProviderNotRegisteredError(id);
  }

  tryGet(id: ProviderId): AIProviderPort | undefined {
    return this.providers.get(id);
  }

  has(id: ProviderId): boolean {
    return this.providers.has(id);
  }

  list(): AIProviderPort[] {
    return [...this.providers.values()];
  }

  listIds(): ProviderId[] {
    return [...this.providers.keys()];
  }

  unregister(id: ProviderId): boolean {
    return this.providers.delete(id);
  }

  clear(): void {
    this.providers.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
