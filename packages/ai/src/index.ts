import { aiEnv, isProviderConfigured } from './env/env';
import { ChatService } from './chat/service';
import { providerRegistry } from './providers/registry';
import { modelRegistry } from './models/registry';
import { promptManager } from './prompts/manager';
import { toolRegistry, toolExecutor } from './tools/index';
import { observabilityTracker } from './observability/tracker';
import { tokenManager } from './token/manager';
import { responseCache } from './cache/index';

export type AIPlatform = {
  chat: ChatService;
  providers: typeof providerRegistry;
  models: typeof modelRegistry;
  prompts: typeof promptManager;
  tools: typeof toolRegistry;
  toolExecutor: typeof toolExecutor;
  observability: typeof observabilityTracker;
  tokens: typeof tokenManager;
  cache: typeof responseCache;
  env: typeof aiEnv;
  isProviderConfigured: typeof isProviderConfigured;
};

/** Create AI platform with default registries. Wire providers via env or register() at startup. */
export function createAIPlatform(options?: {
  configureProviders?: boolean;
}): AIPlatform {
  const configure = options?.configureProviders ?? true;

  if (configure) {
    if (isProviderConfigured('openai')) {
      providerRegistry.create('openai', { apiKey: aiEnv.OPENAI_API_KEY });
    }
    if (isProviderConfigured('anthropic')) {
      providerRegistry.create('anthropic', { apiKey: aiEnv.ANTHROPIC_API_KEY });
    }
    if (isProviderConfigured('google')) {
      providerRegistry.create('google', { apiKey: aiEnv.GOOGLE_AI_API_KEY });
    }
    if (isProviderConfigured('openrouter')) {
      providerRegistry.create('openrouter', { apiKey: aiEnv.OPENROUTER_API_KEY });
    }
    if (isProviderConfigured('azure-openai')) {
      providerRegistry.create('azure-openai', {
        apiKey: aiEnv.AZURE_OPENAI_API_KEY,
        baseUrl: aiEnv.AZURE_OPENAI_ENDPOINT,
      });
    }
    if (isProviderConfigured('ollama')) {
      providerRegistry.create('ollama', { baseUrl: aiEnv.OLLAMA_BASE_URL });
    }
  }

  return {
    chat: new ChatService(),
    providers: providerRegistry,
    models: modelRegistry,
    prompts: promptManager,
    tools: toolRegistry,
    toolExecutor,
    observability: observabilityTracker,
    tokens: tokenManager,
    cache: responseCache,
    env: aiEnv,
    isProviderConfigured,
  };
}

let defaultPlatform: AIPlatform | null = null;

export function getAIPlatform(): AIPlatform {
  if (!defaultPlatform) {
    defaultPlatform = createAIPlatform();
  }
  return defaultPlatform;
}

// Types
export type * from './types';

// Errors
export * from './errors';

// Providers
export * from './providers';

// Models
export * from './models';

// Chat & Completion
export { ChatService, chatService } from './chat';
export type { ChatServiceOptions } from './chat';

// Prompts
export * from './prompts';

// Streaming
export { collectStream, processStream, streamToText } from './streaming';

// Tools
export * from './tools';

// Embeddings (interface)
export * from './embeddings';

// RAG (interface)
export * from './rag';

// Memory (interface)
export * from './memory';

// Observability
export * from './observability';

// Token
export * from './token';

// Cache
export * from './cache';

// Middleware
export * from './middleware';

// Utils
export * from './utils';

// Env
export { aiEnv, isProviderConfigured } from './env/env';
export type { AiEnv } from './env/env';
