import type { ModelKind, ProviderConfig } from '../../types';
import { BaseProviderAdapter } from '../base-provider.adapter';

export class OpenAIProviderAdapter extends BaseProviderAdapter {
  readonly id = 'openai' as const;
  readonly name = 'OpenAI';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision', 'reasoning', 'audio', 'image'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }
}

export class AnthropicProviderAdapter extends BaseProviderAdapter {
  readonly id = 'anthropic' as const;
  readonly name = 'Anthropic';
  readonly capabilities: ModelKind[] = ['chat', 'vision', 'reasoning'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }
}

export class GoogleProviderAdapter extends BaseProviderAdapter {
  readonly id = 'google' as const;
  readonly name = 'Google Gemini';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision', 'reasoning'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }
}

export class OpenRouterProviderAdapter extends BaseProviderAdapter {
  readonly id = 'openrouter' as const;
  readonly name = 'OpenRouter';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision', 'reasoning'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }
}

export class AzureOpenAIProviderAdapter extends BaseProviderAdapter {
  readonly id = 'azure-openai' as const;
  readonly name = 'Azure OpenAI';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision'];

  constructor(config: ProviderConfig = {}) {
    super({
      ...config,
      adapterFramework: config.adapterFramework ?? 'native',
    });
  }

  override isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.baseUrl);
  }
}

export class OllamaProviderAdapter extends BaseProviderAdapter {
  readonly id = 'ollama' as const;
  readonly name = 'Ollama';
  readonly capabilities: ModelKind[] = ['chat', 'embedding'];

  constructor(config: ProviderConfig = {}) {
    super({
      baseUrl: config.baseUrl ?? 'http://localhost:11434',
      ...config,
      adapterFramework: config.adapterFramework ?? 'native',
    });
  }

  override isConfigured(): boolean {
    return Boolean(this.config.baseUrl);
  }
}
