import { aiEnv } from '../env/env';
import { AIProviderError, RateLimitError } from '../errors';
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenUsage,
} from '../types';

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

type OpenRouterChoice = {
  message?: { content?: string | null };
  delta?: { content?: string | null };
  finish_reason?: string | null;
};

type OpenRouterResponse = {
  id?: string;
  model?: string;
  choices?: OpenRouterChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

function getTimeoutMs(): number {
  return aiEnv.AI_REQUEST_TIMEOUT_MS ?? 60_000;
}

function mapMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === 'developer' ? 'system' : message.role,
    content: message.content,
  }));
}

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-startup-validation-tau.vercel.app',
    'X-Title': 'LaunchLens AI',
  };
}

function normalizeUsage(raw: OpenRouterResponse['usage'], content: string, inputText: string): TokenUsage {
  if (raw?.total_tokens) {
    return {
      inputTokens: raw.prompt_tokens ?? 0,
      outputTokens: raw.completion_tokens ?? 0,
      totalTokens: raw.total_tokens,
    };
  }

  const inputTokens = Math.ceil(inputText.length / 4);
  const outputTokens = Math.ceil(content.length / 4);
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
}

function mapFinishReason(value?: string | null): ChatResponse['finishReason'] {
  switch (value) {
    case 'length':
      return 'length';
    case 'tool_calls':
      return 'tool_calls';
    case 'content_filter':
      return 'content_filter';
    default:
      return 'stop';
  }
}

export function mapOpenRouterError(status: number, body: string): Error {
  if (status === 401) {
    return new AIProviderError('OpenRouter API key invalid or missing', 'openrouter', 401, body);
  }
  if (status === 429) {
    return new RateLimitError('OpenRouter rate limit exceeded');
  }
  if (status >= 500) {
    return new AIProviderError(`OpenRouter server error (${status})`, 'openrouter', status, body);
  }
  return new AIProviderError(`OpenRouter API error (${status})`, 'openrouter', status, body);
}

export async function openRouterChat(
  apiKey: string,
  request: ChatRequest,
): Promise<ChatResponse> {
  const start = Date.now();
  const inputText = request.messages.map((m) => m.content).join('\n');

  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: request.model,
      messages: mapMessages(request.messages),
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxTokens ?? 1024,
      stream: false,
      ...(request.responseFormat?.type === 'json_object'
        ? { response_format: { type: 'json_object' } }
        : {}),
    }),
    signal: AbortSignal.timeout(getTimeoutMs()),
  });

  const body = await response.text();

  if (!response.ok) {
    throw mapOpenRouterError(response.status, body);
  }

  const data = JSON.parse(body) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    id: data.id ?? crypto.randomUUID(),
    model: data.model ?? request.model,
    provider: 'openrouter',
    content,
    finishReason: mapFinishReason(data.choices?.[0]?.finish_reason),
    usage: normalizeUsage(data.usage, content, inputText),
    latencyMs: Date.now() - start,
  };
}

export async function* openRouterStream(
  apiKey: string,
  request: ChatRequest,
): AsyncIterable<StreamChunk> {
  const inputText = request.messages.map((m) => m.content).join('\n');
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model: request.model,
      messages: mapMessages(request.messages),
      temperature: request.temperature ?? 0.4,
      max_tokens: request.maxTokens ?? 1024,
      stream: true,
    }),
    signal: AbortSignal.timeout(getTimeoutMs()),
  });

  if (!response.ok) {
    const body = await response.text();
    throw mapOpenRouterError(response.status, body);
  }

  if (!response.body) {
    throw new AIProviderError('OpenRouter stream body missing', 'openrouter', 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamId = crypto.randomUUID();
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        yield {
          id: streamId,
          delta: '',
          done: true,
          usage: normalizeUsage(undefined, fullContent, inputText),
          finishReason: 'stop',
        };
        return;
      }

      try {
        const parsed = JSON.parse(payload) as OpenRouterResponse;
        if (parsed.id) streamId = parsed.id;
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (!delta) continue;
        fullContent += delta;
        yield { id: streamId, delta, done: false };
      } catch {
        /* ignore malformed SSE chunks */
      }
    }
  }

  yield {
    id: streamId,
    delta: '',
    done: true,
    usage: normalizeUsage(undefined, fullContent, inputText),
    finishReason: 'stop',
  };
}

export async function openRouterHealth(apiKey: string): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: buildHeaders(apiKey),
    signal: AbortSignal.timeout(10_000),
  });

  return {
    ok: response.ok,
    latencyMs: Date.now() - start,
  };
}
