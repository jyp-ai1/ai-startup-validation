import type { ChatMessage } from '../types';
import { AIProviderError, RateLimitError } from '../errors';
import { aiEnv, isProviderConfigured } from '../env/env';

export type ResolvedAIProvider = 'openai' | 'anthropic';

export type GenerateCompletionOptions = {
  messages: ChatMessage[];
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type GenerateCompletionResult = {
  text: string;
  provider: ResolvedAIProvider;
  model: string;
};

const DEFAULT_MODELS: Record<ResolvedAIProvider, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
};

export function resolveAIProvider(): ResolvedAIProvider {
  const raw = aiEnv.AI_PROVIDER ?? aiEnv.AI_DEFAULT_PROVIDER;
  if (raw === 'OPENAI' || raw === 'openai') return 'openai';
  if (raw === 'CLAUDE' || raw === 'anthropic') return 'anthropic';

  if (isProviderConfigured('openai')) return 'openai';
  if (isProviderConfigured('anthropic')) return 'anthropic';

  return 'openai';
}

export function resolveAIModel(provider: ResolvedAIProvider): string {
  if (aiEnv.AI_DEFAULT_MODEL) return aiEnv.AI_DEFAULT_MODEL;
  return DEFAULT_MODELS[provider];
}

export function isAIConfigured(): boolean {
  const provider = resolveAIProvider();
  return isProviderConfigured(provider);
}

function getTimeoutMs(override?: number): number {
  return override ?? aiEnv.AI_REQUEST_TIMEOUT_MS ?? 60_000;
}

function mapOpenAIMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'developer' ? 'system' : message.role,
    content: message.content,
  }));
}

async function openaiCompletion(
  options: GenerateCompletionOptions,
): Promise<GenerateCompletionResult> {
  const apiKey = aiEnv.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AIProviderError('OPENAI_API_KEY is not configured', 'openai', 503);
  }

  const model = resolveAIModel('openai');
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: mapOpenAIMessages(options.messages),
      temperature: options.temperature ?? 0.4,
      max_tokens: options.maxTokens ?? 8192,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
    signal: AbortSignal.timeout(getTimeoutMs(options.timeoutMs)),
  });

  if (response.status === 429) {
    throw new RateLimitError('OpenAI rate limit exceeded');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new AIProviderError(
      `OpenAI API error (${response.status})`,
      'openai',
      response.status,
      body,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new AIProviderError('OpenAI returned empty response', 'openai', 502);
  }

  return { text, provider: 'openai', model };
}

async function anthropicCompletion(
  options: GenerateCompletionOptions,
): Promise<GenerateCompletionResult> {
  const apiKey = aiEnv.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIProviderError('ANTHROPIC_API_KEY is not configured', 'anthropic', 503);
  }

  const model = resolveAIModel('anthropic');
  const systemParts = options.messages.filter((m) => m.role === 'system' || m.role === 'developer');
  const userParts = options.messages.filter((m) => m.role === 'user');

  const system = [
    ...systemParts.map((m) => m.content),
    options.jsonMode ? 'Respond ONLY with valid JSON. No markdown fences.' : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const userContent = userParts.map((m) => m.content).join('\n\n');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.4,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(getTimeoutMs(options.timeoutMs)),
  });

  if (response.status === 429) {
    throw new RateLimitError('Anthropic rate limit exceeded');
  }

  if (!response.ok) {
    const body = await response.text();
    throw new AIProviderError(
      `Anthropic API error (${response.status})`,
      'anthropic',
      response.status,
      body,
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const text = data.content?.find((block) => block.type === 'text')?.text;
  if (!text) {
    throw new AIProviderError('Anthropic returned empty response', 'anthropic', 502);
  }

  return { text, provider: 'anthropic', model };
}

/** Provider-agnostic completion — OpenAI or Anthropic via env. */
export async function generateCompletion(
  options: GenerateCompletionOptions,
): Promise<GenerateCompletionResult> {
  const provider = resolveAIProvider();

  if (!isProviderConfigured(provider)) {
    throw new AIProviderError(
      `AI provider "${provider}" is not configured. Set API keys in environment.`,
      provider,
      503,
    );
  }

  try {
    if (provider === 'anthropic') {
      return await anthropicCompletion(options);
    }
    return await openaiCompletion(options);
  } catch (error) {
    if (error instanceof AIProviderError || error instanceof RateLimitError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw new AIProviderError('AI request timed out', provider, 504);
    }
    throw new AIProviderError(
      error instanceof Error ? error.message : 'Unknown AI error',
      provider,
      502,
      error,
    );
  }
}

export async function generateJSON(
  options: GenerateCompletionOptions,
): Promise<GenerateCompletionResult> {
  return generateCompletion({ ...options, jsonMode: true });
}
