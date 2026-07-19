import type { Logger } from '@repo/core/logger';
import { logger as appLogger } from '@repo/core/logger';

import type {
  ChatRequest,
  ChatResponse,
  CompletionRequest,
  CompletionResponse,
  GenerateJSONRequest,
  GenerateJSONResponse,
  GenerateObjectRequest,
  GenerateObjectResponse,
  StreamChunk,
} from '../types';
import { ModelNotFoundError } from '../errors';
import type { ProviderRegistry } from '../providers/registry';
import { providerRegistry } from '../providers/registry';
import type { ModelRegistry } from '../models/registry';
import { modelRegistry } from '../models/registry';
import type { ObservabilityTracker } from '../observability/tracker';
import { observabilityTracker } from '../observability/tracker';
import type { TokenManager } from '../token/manager';
import { tokenManager } from '../token/manager';
import type { ResponseCachePort } from '../cache/index';
import { createCacheKey, responseCache } from '../cache/index';
import { withRetry } from '../middleware/index';

export type ChatServiceOptions = {
  providers?: ProviderRegistry;
  models?: ModelRegistry;
  observability?: ObservabilityTracker;
  tokens?: TokenManager;
  cache?: ResponseCachePort;
  logger?: Logger;
  enableCache?: boolean;
};

/** Unified Chat API — applications use this, never provider SDKs. */
export class ChatService {
  private readonly providers: ProviderRegistry;
  private readonly models: ModelRegistry;
  private readonly observability: ObservabilityTracker;
  private readonly tokens: TokenManager;
  private readonly cache: ResponseCachePort;
  private readonly log: Logger;
  private readonly enableCache: boolean;

  constructor(options: ChatServiceOptions = {}) {
    this.providers = options.providers ?? providerRegistry;
    this.models = options.models ?? modelRegistry;
    this.observability = options.observability ?? observabilityTracker;
    this.tokens = options.tokens ?? tokenManager;
    this.cache = options.cache ?? responseCache;
    this.log = options.logger ?? appLogger.child('ai.chat');
    this.enableCache = options.enableCache ?? false;
  }

  private resolveProvider(modelId: string) {
    const model = this.models.get(modelId);
    return { model, provider: this.providers.get(model.provider) };
  }

  private recordEvent(
    operation: Parameters<ObservabilityTracker['record']>[0]['operation'],
    modelId: string,
    providerId: ChatResponse['provider'],
    latencyMs: number,
    usage: ChatResponse['usage'],
    success: boolean,
    retries: number,
    error?: string,
  ): void {
    this.observability.record({
      provider: providerId,
      model: modelId,
      operation,
      latencyMs,
      usage,
      estimatedCostUsd: this.tokens.estimateCostUsd(modelId, usage),
      success,
      error,
      retries,
    });
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { model, provider } = this.resolveProvider(request.model);

    if (this.enableCache) {
      const key = createCacheKey({
        op: 'chat',
        model: request.model,
        messages: JSON.stringify(request.messages),
      });
      const cached = await this.cache.get(key);
      if (cached) return cached;
    }

    const { result, retries } = await withRetry(() => provider.chat(request));

    this.recordEvent(
      'chat',
      request.model,
      result.provider,
      result.latencyMs,
      result.usage,
      true,
      retries,
    );

    if (this.enableCache) {
      const key = createCacheKey({
        op: 'chat',
        model: request.model,
        messages: JSON.stringify(request.messages),
      });
      await this.cache.set(key, result);
    }

    this.log.debug('chat completed', { model: model.id, provider: result.provider });
    return result;
  }

  async *stream(request: ChatRequest): AsyncIterable<StreamChunk> {
    const { provider } = this.resolveProvider(request.model);
    const start = Date.now();
    let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let providerId = this.models.get(request.model).provider;

    try {
      for await (const chunk of provider.stream(request)) {
        if (chunk.usage) usage = chunk.usage;
        yield chunk;
      }
      this.recordEvent('stream', request.model, providerId, Date.now() - start, usage, true, 0);
    } catch (error) {
      this.recordEvent(
        'stream',
        request.model,
        providerId,
        Date.now() - start,
        usage,
        false,
        0,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const { provider } = this.resolveProvider(request.model);
    const { result, retries } = await withRetry(() => provider.complete(request));

    this.recordEvent(
      'complete',
      request.model,
      result.provider,
      result.latencyMs,
      result.usage,
      true,
      retries,
    );

    return result;
  }

  async generateJSON(request: GenerateJSONRequest): Promise<GenerateJSONResponse> {
    const chatRequest: ChatRequest = {
      ...request,
      responseFormat: { type: 'json_object' },
    };
    const response = await this.chat(chatRequest);

    let json: unknown;
    try {
      json = JSON.parse(response.content);
    } catch {
      throw new ModelNotFoundError(request.model, {
        reason: 'Invalid JSON in model response',
        content: response.content,
      });
    }

    this.recordEvent(
      'generateJSON',
      request.model,
      response.provider,
      response.latencyMs,
      response.usage,
      true,
      0,
    );

    return {
      json,
      usage: response.usage,
      latencyMs: response.latencyMs,
      provider: response.provider,
      model: response.model,
    };
  }

  async generateObject<T = unknown>(
    request: GenerateObjectRequest<T>,
  ): Promise<GenerateObjectResponse<T>> {
    const chatRequest: ChatRequest = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature,
      responseFormat: { type: 'json_schema', schema: request.schema },
    };
    const response = await this.chat(chatRequest);

    let object: T;
    try {
      object = JSON.parse(response.content) as T;
    } catch {
      throw new ModelNotFoundError(request.model, {
        reason: 'Invalid structured output',
        content: response.content,
      });
    }

    this.recordEvent(
      'generateObject',
      request.model,
      response.provider,
      response.latencyMs,
      response.usage,
      true,
      0,
    );

    return {
      object,
      usage: response.usage,
      latencyMs: response.latencyMs,
      provider: response.provider,
      model: response.model,
    };
  }
}

export const chatService = new ChatService();
