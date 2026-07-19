/** Supported AI provider identifiers. */
export const PROVIDER_IDS = [
  'openai',
  'anthropic',
  'google',
  'openrouter',
  'azure-openai',
  'ollama',
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Model capability categories. */
export const MODEL_KINDS = [
  'chat',
  'embedding',
  'vision',
  'reasoning',
  'audio',
  'image',
] as const;

export type ModelKind = (typeof MODEL_KINDS)[number];

/** Message roles in a conversation. */
export type MessageRole = 'system' | 'user' | 'assistant' | 'developer' | 'tool';

export type ChatMessage = {
  role: MessageRole;
  content: string;
  name?: string;
  toolCallId?: string;
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: string[];
  tools?: ToolDefinitionRef[];
  responseFormat?: ResponseFormat;
  metadata?: Record<string, unknown>;
};

export type ToolDefinitionRef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type ResponseFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | { type: 'json_schema'; schema: Record<string, unknown> };

export type ChatResponse = {
  id: string;
  model: string;
  provider: ProviderId;
  content: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  usage: TokenUsage;
  toolCalls?: ToolCallResult[];
  latencyMs: number;
};

export type ToolCallResult = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type CompletionRequest = {
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResponse = {
  id: string;
  model: string;
  provider: ProviderId;
  text: string;
  usage: TokenUsage;
  latencyMs: number;
};

export type StreamChunk = {
  id: string;
  delta: string;
  done: boolean;
  usage?: TokenUsage;
  finishReason?: ChatResponse['finishReason'];
};

export type EmbeddingRequest = {
  model: string;
  input: string | string[];
};

export type EmbeddingResponse = {
  model: string;
  provider: ProviderId;
  embeddings: number[][];
  usage: TokenUsage;
  latencyMs: number;
};

export type GenerateObjectRequest<T = unknown> = {
  model: string;
  messages: ChatMessage[];
  schema: Record<string, unknown>;
  temperature?: number;
};

export type GenerateObjectResponse<T = unknown> = {
  object: T;
  usage: TokenUsage;
  latencyMs: number;
  provider: ProviderId;
  model: string;
};

export type GenerateJSONRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
};

export type GenerateJSONResponse = {
  json: unknown;
  usage: TokenUsage;
  latencyMs: number;
  provider: ProviderId;
  model: string;
};

/** Adapter framework — applications never depend on these directly. */
export type AdapterFramework = 'native' | 'ai-sdk' | 'langchain' | 'llamaindex';

export type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  adapterFramework?: AdapterFramework;
  defaultModel?: string;
};
