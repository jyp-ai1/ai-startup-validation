import type { ChatRequest, ChatResponse, CompletionRequest, CompletionResponse, EmbeddingRequest, EmbeddingResponse, ModelKind, ProviderConfig, ProviderId, StreamChunk } from '../types';
import { AIProviderError } from '../errors';
import type { AIProviderPort } from './provider.port';

/** Base stub adapter — real SDK adapters replace this in production wiring. */
export abstract class BaseProviderAdapter implements AIProviderPort {
  abstract readonly id: ProviderId;
  abstract readonly name: string;
  abstract readonly capabilities: ModelKind[];
  readonly adapterFramework: ProviderConfig['adapterFramework'] = 'native';

  constructor(protected readonly config: ProviderConfig = {}) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey ?? this.config.baseUrl);
  }

  protected ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new AIProviderError(
        `${this.name} provider is not configured. Set API key or base URL.`,
        this.id,
        503,
      );
    }
  }

  protected createResponse(
    request: ChatRequest,
    content: string,
    latencyMs: number,
  ): ChatResponse {
    const inputTokens = estimateTokens(request.messages.map((m) => m.content).join(' '));
    const outputTokens = estimateTokens(content);
    return {
      id: crypto.randomUUID(),
      model: request.model,
      provider: this.id,
      content,
      finishReason: 'stop',
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      latencyMs,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    this.ensureConfigured();
    const start = Date.now();
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');

    let content: string;
    if (request.responseFormat?.type === 'json_object') {
      content = JSON.stringify({ stub: true, echo: lastUser?.content ?? '' });
    } else if (request.responseFormat?.type === 'json_schema') {
      content = JSON.stringify({ result: lastUser?.content ?? '', validated: true });
    } else {
      content = `[${this.name} stub] ${lastUser?.content ?? ''}`;
    }

    return this.createResponse(request, content, Date.now() - start);
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    this.ensureConfigured();
    const response = await this.chat(request);
    const id = response.id;
    const words = response.content.split(' ');
    for (let i = 0; i < words.length; i++) {
      yield {
        id,
        delta: (i === 0 ? '' : ' ') + words[i],
        done: false,
      };
    }
    yield {
      id,
      delta: '',
      done: true,
      usage: response.usage,
      finishReason: response.finishReason,
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    this.ensureConfigured();
    const start = Date.now();
    const inputTokens = estimateTokens(request.prompt);
    const text = `[${this.name} stub completion] ${request.prompt.slice(0, 100)}`;
    const outputTokens = estimateTokens(text);
    return {
      id: crypto.randomUUID(),
      model: request.model,
      provider: this.id,
      text,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
      latencyMs: Date.now() - start,
    };
  }

  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    this.ensureConfigured();
    const inputs = Array.isArray(request.input) ? request.input : [request.input];
    const start = Date.now();
    const inputTokens = estimateTokens(inputs.join(' '));
    return {
      model: request.model,
      provider: this.id,
      embeddings: inputs.map(() => Array.from({ length: 8 }, () => Math.random())),
      usage: { inputTokens, outputTokens: 0, totalTokens: inputTokens },
      latencyMs: Date.now() - start,
    };
  }
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
