import type {
  ChatRequest,
  ChatResponse,
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelKind,
  ProviderConfig,
  ProviderId,
  StreamChunk,
} from '../types';

/** Provider adapter port — hide OpenAI SDK, AI SDK, LangChain, etc. behind this. */
export interface AIProviderPort {
  readonly id: ProviderId;
  readonly name: string;
  readonly capabilities: ModelKind[];
  readonly adapterFramework: ProviderConfig['adapterFramework'];

  isConfigured(): boolean;

  chat(request: ChatRequest): Promise<ChatResponse>;
  stream(request: ChatRequest): AsyncIterable<StreamChunk>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  embed?(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}

export type ProviderFactory = (config?: ProviderConfig) => AIProviderPort;
