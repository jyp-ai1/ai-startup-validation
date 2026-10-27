import type {
  ChatRequest,
  ChatResponse,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelKind,
  ProviderConfig,
  StreamChunk,
} from '../../types';
import { AIProviderError } from '../../errors';
import { BaseProviderAdapter } from '../base-provider.adapter';
import { googleChat, readGoogleOutputTokenCeiling } from '../google-http';
import { openAIChat, openAIStream } from '../openai-http';
import { openRouterChat, openRouterStream } from '../openrouter-http';

export class OpenAIProviderAdapter extends BaseProviderAdapter {
  readonly id = 'openai' as const;
  readonly name = 'OpenAI';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision', 'reasoning', 'audio', 'image'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }

  override isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureConfigured();
    return openAIChat(this.config.apiKey!, request);
  }

  override async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.ensureConfigured();
    yield* openAIStream(this.config.apiKey!, request);
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

  protected override refusesStubResponse(): boolean {
    return true;
  }

  override isConfigured(): boolean {
    return Boolean(this.config.apiKey?.trim());
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = this.config.apiKey?.trim();
    if (!apiKey) {
      throw new AIProviderError(
        'Google Gemini is not configured. Set GOOGLE_AI_API_KEY. A missing key does not return a stub success.',
        'google',
        503,
      );
    }
    return googleChat({
      apiKey,
      request,
      maxOutputTokensCeiling:
        this.config.maxOutputTokensCeiling ?? readGoogleOutputTokenCeiling(),
      fetchImpl: this.config.fetchImpl,
      baseUrl: this.config.baseUrl,
      timeoutMs: this.config.requestTimeoutMs,
    });
  }

  override async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const response = await this.chat(request);
    yield { id: response.id, delta: response.content, done: false };
    yield {
      id: response.id,
      delta: '',
      done: true,
      usage: response.usage,
      usageKnown: response.usageKnown,
      finishReason: response.finishReason,
    };
  }

  override async complete(_request: CompletionRequest): Promise<CompletionResponse> {
    throw new AIProviderError(
      'Google Gemini complete() is not a generateContent call. A stub completion is not a successful call.',
      'google',
      501,
    );
  }

  override async embed(_request: EmbeddingRequest): Promise<EmbeddingResponse> {
    throw new AIProviderError(
      'Google Gemini embed() is not a generateContent call. A stub embedding is not a successful call.',
      'google',
      501,
    );
  }
}

export class OpenRouterProviderAdapter extends BaseProviderAdapter {
  readonly id = 'openrouter' as const;
  readonly name = 'OpenRouter';
  readonly capabilities: ModelKind[] = ['chat', 'embedding', 'vision', 'reasoning'];

  constructor(config: ProviderConfig = {}) {
    super({ ...config, adapterFramework: config.adapterFramework ?? 'native' });
  }

  override isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  override async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureConfigured();
    return openRouterChat(this.config.apiKey!, request);
  }

  override async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.ensureConfigured();
    yield* openRouterStream(this.config.apiKey!, request);
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
