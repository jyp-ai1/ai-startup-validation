import type { ModelKind, ProviderId } from '../types';
import { ModelNotFoundError } from '../errors';

export type BaseModel = {
  id: string;
  name: string;
  provider: ProviderId;
  kind: ModelKind;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsVision: boolean;
};

export type ChatModel = BaseModel & { kind: 'chat' };
export type EmbeddingModel = BaseModel & { kind: 'embedding'; dimensions: number };
export type VisionModel = BaseModel & { kind: 'vision' };
export type ReasoningModel = BaseModel & { kind: 'reasoning' };
export type AudioModel = BaseModel & { kind: 'audio' };
export type ImageModel = BaseModel & { kind: 'image' };

export type AIModel =
  | ChatModel
  | EmbeddingModel
  | VisionModel
  | ReasoningModel
  | AudioModel
  | ImageModel;

/** Default model catalog — extend or override at runtime. */
export const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    kind: 'chat',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'text-embedding-3-small',
    name: 'Text Embedding 3 Small',
    provider: 'openai',
    kind: 'embedding',
    contextWindow: 8191,
    maxOutputTokens: 0,
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
    dimensions: 1536,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    kind: 'chat',
    contextWindow: 200_000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    kind: 'chat',
    contextWindow: 1_000_000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'gemini-embedding-001',
    name: 'Gemini Embedding',
    provider: 'google',
    kind: 'embedding',
    contextWindow: 2048,
    maxOutputTokens: 0,
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
    dimensions: 768,
  },
  {
    id: 'openrouter/auto',
    name: 'OpenRouter Auto',
    provider: 'openrouter',
    kind: 'chat',
    contextWindow: 128_000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },
  {
    id: 'gpt-4o-azure',
    name: 'GPT-4o (Azure)',
    provider: 'azure-openai',
    kind: 'chat',
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
  },
  {
    id: 'llama3.2',
    name: 'Llama 3.2',
    provider: 'ollama',
    kind: 'chat',
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
  },
  {
    id: 'o1',
    name: 'O1 Reasoning',
    provider: 'openai',
    kind: 'reasoning',
    contextWindow: 200_000,
    maxOutputTokens: 100_000,
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: false,
  },
  {
    id: 'gpt-4o-audio',
    name: 'GPT-4o Audio',
    provider: 'openai',
    kind: 'audio',
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'openai',
    kind: 'image',
    contextWindow: 0,
    maxOutputTokens: 0,
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
  },
];

/** Registry of models across all providers. */
export class ModelRegistry {
  private readonly models = new Map<string, AIModel>();

  constructor(initial: AIModel[] = DEFAULT_MODELS) {
    for (const model of initial) {
      this.register(model);
    }
  }

  register(model: AIModel): void {
    this.models.set(model.id, model);
  }

  get(id: string): AIModel {
    const model = this.models.get(id);
    if (!model) {
      throw new ModelNotFoundError(id);
    }
    return model;
  }

  tryGet(id: string): AIModel | undefined {
    return this.models.get(id);
  }

  has(id: string): boolean {
    return this.models.has(id);
  }

  list(): AIModel[] {
    return [...this.models.values()];
  }

  listByProvider(provider: ProviderId): AIModel[] {
    return this.list().filter((m) => m.provider === provider);
  }

  listByKind<K extends ModelKind>(
    kind: K,
  ): Extract<AIModel, { kind: K }>[] {
    return this.list().filter((m) => m.kind === kind) as Extract<AIModel, { kind: K }>[];
  }

  getChatModel(id: string): ChatModel {
    const model = this.get(id);
    if (model.kind !== 'chat') {
      throw new ModelNotFoundError(id, { expectedKind: 'chat', actualKind: model.kind });
    }
    return model;
  }

  getEmbeddingModel(id: string): EmbeddingModel {
    const model = this.get(id);
    if (model.kind !== 'embedding') {
      throw new ModelNotFoundError(id, { expectedKind: 'embedding', actualKind: model.kind });
    }
    return model;
  }
}

export const modelRegistry = new ModelRegistry();
