import { aiEnv } from '../env/env';
import { AIProviderError, RateLimitError } from '../errors';
import type {
  ChatMessage,
  ChatRequest,
  ChatResponse,
  StreamChunk,
  TokenUsage,
} from '../types';

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

type OpenAIChoice = {
  message?: { content?: string | null };
  delta?: { content?: string | null };
  finish_reason?: string | null;
};

type OpenAIResponse = {
  id?: string;
  model?: string;
  choices?: OpenAIChoice[];
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

function normalizeUsage(raw: OpenAIResponse['usage'], content: string, inputText: string): TokenUsage {
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

const DIAGNOSTIC_HEADERS = [
  'retry-after',
  'x-request-id',
  'x-ratelimit-limit-requests',
  'x-ratelimit-limit-tokens',
  'x-ratelimit-remaining-requests',
  'x-ratelimit-remaining-tokens',
  'x-ratelimit-reset-requests',
  'x-ratelimit-reset-tokens',
] as const;

export type OpenAIErrorDiagnostics = {
  status: number;
  code: string | null;
  type: string | null;
  message: string | null;
  requestId: string | null;
  retryAfter: string | null;
  rateLimit: Record<string, string>;
};

function safeDiagnosticValue(value: unknown, max = 80): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  if (!/^[\w.+@:=, -]+$/.test(trimmed)) return null;
  if (/sk-|bearer|eyJ/i.test(trimmed)) return null;
  return trimmed;
}

function safeProviderMessage(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value
    .replace(/\s+/g, ' ')
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}/g, '[redacted]')
    .trim()
    .slice(0, 180);
  return trimmed || null;
}

/** Safe provider fields only. The raw body and credentials are not returned. */
export function readOpenAIErrorDiagnostics(
  status: number,
  body: string,
  headers?: Headers,
): OpenAIErrorDiagnostics {
  let code: string | null = null;
  let type: string | null = null;
  let message: string | null = null;
  try {
    const parsed = JSON.parse(body) as { error?: { code?: unknown; type?: unknown; message?: unknown } };
    code = safeDiagnosticValue(parsed.error?.code, 64);
    type = safeDiagnosticValue(parsed.error?.type, 64);
    message = safeProviderMessage(parsed.error?.message);
  } catch {
    message = null;
  }
  const requestId = headers ? safeDiagnosticValue(headers.get('x-request-id'), 128) : null;
  const retryAfter = headers ? safeDiagnosticValue(headers.get('retry-after'), 80) : null;
  const rateLimit: Record<string, string> = {};
  if (headers) {
    for (const name of DIAGNOSTIC_HEADERS) {
      if (name === 'retry-after' || name === 'x-request-id') continue;
      const value = safeDiagnosticValue(headers.get(name));
      if (value) rateLimit[name] = value;
    }
  }
  return { status, code, type, message, requestId, retryAfter, rateLimit };
}

export function formatOpenAIErrorDiagnostics(diagnostics: OpenAIErrorDiagnostics): string {
  const parts = [`provider_http=${diagnostics.status}`];
  if (diagnostics.code) parts.push(`code=${diagnostics.code}`);
  if (diagnostics.type) parts.push(`type=${diagnostics.type}`);
  if (diagnostics.message) parts.push(`message=${diagnostics.message}`);
  if (diagnostics.requestId) parts.push(`request_id=${diagnostics.requestId}`);
  if (diagnostics.retryAfter) parts.push(`retry_after=${diagnostics.retryAfter}`);
  for (const [name, value] of Object.entries(diagnostics.rateLimit)) parts.push(`${name}=${value}`);
  return parts.join(' ');
}

function retryAfterMs(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 86_400) return undefined;
  return seconds * 1000;
}

export function mapOpenAIError(status: number, body: string, headers?: Headers): Error {
  const diagnostics = formatOpenAIErrorDiagnostics(readOpenAIErrorDiagnostics(status, body, headers));
  if (status === 401) {
    return new AIProviderError(`OpenAI API key invalid or missing ${diagnostics}`, 'openai', 401);
  }
  if (status === 429) {
    const retryAfter = headers ? safeDiagnosticValue(headers.get('retry-after'), 80) : null;
    return new RateLimitError(`OpenAI rate limit exceeded ${diagnostics}`, retryAfterMs(retryAfter));
  }
  if (status >= 500) {
    return new AIProviderError(`OpenAI server error (${status}) ${diagnostics}`, 'openai', status);
  }
  return new AIProviderError(`OpenAI API error (${status}) ${diagnostics}`, 'openai', status);
}

export async function openAIChat(apiKey: string, request: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const inputText = request.messages.map((m) => m.content).join('\n');

  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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
    throw mapOpenAIError(response.status, body, response.headers);
  }

  const data = JSON.parse(body) as OpenAIResponse;
  const content = data.choices?.[0]?.message?.content ?? '';

  return {
    id: data.id ?? crypto.randomUUID(),
    model: data.model ?? request.model,
    provider: 'openai',
    content,
    finishReason: mapFinishReason(data.choices?.[0]?.finish_reason),
    usage: normalizeUsage(data.usage, content, inputText),
    usageKnown: Boolean(data.usage?.total_tokens),
    latencyMs: Date.now() - start,
  };
}

export async function* openAIStream(
  apiKey: string,
  request: ChatRequest,
): AsyncIterable<StreamChunk> {
  const inputText = request.messages.map((m) => m.content).join('\n');
  const response = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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
    throw mapOpenAIError(response.status, body, response.headers);
  }

  if (!response.body) {
    throw new AIProviderError('OpenAI stream body missing', 'openai', 502);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamId: string = crypto.randomUUID();
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
        const parsed = JSON.parse(payload) as OpenAIResponse;
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

export async function openAIHealth(apiKey: string): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });

  return {
    ok: response.ok,
    latencyMs: Date.now() - start,
  };
}
