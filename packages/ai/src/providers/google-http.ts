import { AIProviderError, RateLimitError, SafetyError, TokenLimitError } from '../errors';
import type { ChatMessage, ChatRequest, ChatResponse, TokenUsage } from '../types';

const DEFAULT_GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com';
const GEMINI_MODEL_ID = /^gemini-[A-Za-z0-9][A-Za-z0-9.\-]*$/;

export type GoogleChatOptions = {
  apiKey: string;
  request: ChatRequest;
  maxOutputTokensCeiling?: number;
  fetchImpl?: (input: string | URL, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  baseUrl?: string;
};

export type PreservedAnalysisRound = {
  round: 1 | 2;
  model: string;
  content: string;
  usageKnown: boolean;
  /** Null when the response had no usage metadata. Null is not a measured zero. */
  usage: TokenUsage | null;
  /** True when this round was produced by the generateContent HTTP client. */
  liveModelCall: boolean;
  groundingUsed: false;
  sourceUrls: [];
  /** Cost is not calculated here. Null is not 0. */
  costUsd: null;
  finishReason: ChatResponse['finishReason'];
  requestedAt: string;
};

type GeminiPart = { text?: string };
type GeminiContent = { role: 'user' | 'model'; parts: Array<{ text: string }> };

type GeminiResponse = {
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: GeminiPart[] };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export function geminiGenerateContentUrl(
  model: string,
  baseUrl: string = DEFAULT_GEMINI_BASE_URL,
): string {
  const root = baseUrl.replace(/\/$/, '');
  return `${root}/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

/** Strip an OpenRouter-style `google/` prefix. Reject ids that are not Gemini API model ids. */
export function resolveGoogleApiModel(model: string): string {
  const id = model.startsWith('google/') ? model.slice('google/'.length) : model;
  if (!GEMINI_MODEL_ID.test(id)) {
    throw new AIProviderError(
      `Model "${model}" is not a Gemini API model id. Use gemini-2.0-flash.`,
      'google',
      400,
    );
  }
  return id;
}

export function readGoogleOutputTokenCeiling(
  env: Record<string, string | undefined> = process.env,
): number | undefined {
  const raw = env.GOOGLE_AI_MAX_OUTPUT_TOKENS;
  if (raw == null || !/^[1-9]\d*$/.test(raw.trim())) return undefined;
  const value = Number(raw.trim());
  if (!Number.isSafeInteger(value) || value <= 0) return undefined;
  return value;
}

function resolveTimeoutMs(explicit?: number): number {
  if (explicit != null && Number.isInteger(explicit) && explicit > 0) return explicit;
  const raw = process.env.AI_REQUEST_TIMEOUT_MS;
  if (raw && /^[1-9]\d*$/.test(raw.trim())) return Number(raw.trim());
  return 60_000;
}

function redact(text: string, secret: string): string {
  const hidden = secret ? text.split(secret).join('[redacted]') : text;
  return hidden.slice(0, 500);
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export function assertGeminiRequestAllowed(
  request: ChatRequest,
  ceiling: number | undefined,
): number {
  if (request.tools?.length) {
    throw new AIProviderError(
      'Gemini tools are not sent. Web search and grounding are not implemented on this call.',
      'google',
      400,
    );
  }
  if (ceiling == null || !Number.isInteger(ceiling) || ceiling <= 0) {
    throw new AIProviderError(
      'Gemini call refused: set GOOGLE_AI_MAX_OUTPUT_TOKENS to a positive integer. A missing ceiling is not a free call and is not cost 0.',
      'google',
      503,
    );
  }
  if (request.maxTokens == null || !Number.isInteger(request.maxTokens) || request.maxTokens <= 0) {
    throw new AIProviderError(
      'Gemini call refused: set request.maxTokens to a positive integer within the output ceiling.',
      'google',
      400,
    );
  }
  if (request.maxTokens > ceiling) {
    throw new TokenLimitError(ceiling, request.maxTokens);
  }
  return request.maxTokens;
}

function buildGeminiBody(request: ChatRequest, maxOutputTokens: number): Record<string, unknown> {
  const systemTexts: string[] = [];
  const contents: GeminiContent[] = [];

  for (const message of request.messages) {
    if (message.role === 'system' || message.role === 'developer') {
      systemTexts.push(message.content);
      continue;
    }
    if (message.role === 'tool') {
      throw new AIProviderError(
        'Gemini generateContent does not accept tool messages in this adapter.',
        'google',
        400,
      );
    }
    const role = message.role === 'assistant' ? 'model' : 'user';
    const last = contents.at(-1);
    if (last && last.role === role) {
      last.parts.push({ text: message.content });
    } else {
      contents.push({ role, parts: [{ text: message.content }] });
    }
  }

  if (contents.length === 0 || contents[0]?.role !== 'user') {
    throw new AIProviderError('Gemini generateContent requires a user message.', 'google', 400);
  }

  const generationConfig: Record<string, unknown> = { maxOutputTokens };
  if (request.temperature != null) generationConfig.temperature = request.temperature;
  if (request.topP != null) generationConfig.topP = request.topP;
  if (request.stop?.length) generationConfig.stopSequences = request.stop;
  if (
    request.responseFormat?.type === 'json_object' ||
    request.responseFormat?.type === 'json_schema'
  ) {
    generationConfig.responseMimeType = 'application/json';
  }
  if (request.responseFormat?.type === 'json_schema') {
    generationConfig.responseSchema = request.responseFormat.schema;
  }

  const body: Record<string, unknown> = { contents, generationConfig };
  if (systemTexts.length > 0) {
    body.systemInstruction = { parts: [{ text: systemTexts.join('\n\n') }] };
  }
  return body;
}

export function mapGeminiHttpError(status: number, body: string, apiKey: string): Error {
  const safe = redact(body, apiKey);
  if (status === 401 || status === 403) {
    return new AIProviderError(
      `Gemini authentication failed (${status}).`,
      'google',
      status,
      safe,
    );
  }
  if (status === 429) {
    return new RateLimitError('Gemini rate limit exceeded.');
  }
  if (status >= 500) {
    return new AIProviderError(`Gemini server error (${status}).`, 'google', status, safe);
  }
  return new AIProviderError(`Gemini API error (${status}).`, 'google', status, safe);
}

function readUsage(meta: GeminiResponse['usageMetadata']): {
  usage: TokenUsage;
  usageKnown: boolean;
} {
  const input = meta?.promptTokenCount;
  const output = meta?.candidatesTokenCount;
  const total = meta?.totalTokenCount;
  if (
    typeof input === 'number' &&
    Number.isFinite(input) &&
    typeof output === 'number' &&
    Number.isFinite(output) &&
    typeof total === 'number' &&
    Number.isFinite(total)
  ) {
    return {
      usageKnown: true,
      usage: { inputTokens: input, outputTokens: output, totalTokens: total },
    };
  }
  return {
    usageKnown: false,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  };
}

function mapFinishReason(value?: string): ChatResponse['finishReason'] {
  switch (value) {
    case 'STOP':
    case undefined:
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
    case 'BLOCKLIST':
    case 'PROHIBITED_CONTENT':
    case 'SPII':
      return 'content_filter';
    default:
      return 'error';
  }
}

function candidateText(parts: GeminiPart[] | undefined): string {
  return (parts ?? []).map((part) => part.text ?? '').join('');
}

export async function googleChat(options: GoogleChatOptions): Promise<ChatResponse> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) {
    throw new AIProviderError(
      'Google Gemini is not configured. Set GOOGLE_AI_API_KEY. A missing key does not return a stub success.',
      'google',
      503,
    );
  }

  const maxOutputTokens = assertGeminiRequestAllowed(
    options.request,
    options.maxOutputTokensCeiling,
  );
  const apiModel = resolveGoogleApiModel(options.request.model);
  const url = geminiGenerateContentUrl(apiModel, options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const start = Date.now();

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(buildGeminiBody(options.request, maxOutputTokens)),
      signal: AbortSignal.timeout(resolveTimeoutMs(options.timeoutMs)),
    });
  } catch (error) {
    const timedOut = isTimeoutError(error);
    const detail = error instanceof Error ? redact(error.message, apiKey) : '';
    throw new AIProviderError(
      timedOut
        ? 'Gemini request timed out before a response.'
        : `Gemini request failed before a response.${detail ? ` ${detail}` : ''}`,
      'google',
      timedOut ? 504 : 502,
    );
  }

  const body = await response.text();
  if (!response.ok) {
    throw mapGeminiHttpError(response.status, body, apiKey);
  }

  let data: GeminiResponse;
  try {
    data = JSON.parse(body) as GeminiResponse;
  } catch {
    throw new AIProviderError('Gemini response was not valid JSON.', 'google', 502);
  }

  if (data.promptFeedback?.blockReason) {
    throw new SafetyError(`Gemini blocked the prompt (${data.promptFeedback.blockReason}).`);
  }

  const candidate = data.candidates?.[0];
  if (!candidate) {
    throw new AIProviderError('Gemini response did not include a candidate.', 'google', 502);
  }

  const content = candidateText(candidate.content?.parts);
  if (candidate.finishReason === 'SAFETY' && content.length === 0) {
    throw new SafetyError('Gemini blocked the candidate.');
  }

  const usage = readUsage(data.usageMetadata);
  const model =
    typeof data.modelVersion === 'string' && data.modelVersion.trim().length > 0
      ? data.modelVersion
      : apiModel;

  return {
    id: crypto.randomUUID(),
    model,
    provider: 'google',
    content,
    finishReason: mapFinishReason(candidate.finishReason),
    usage: usage.usage,
    usageKnown: usage.usageKnown,
    groundingUsed: false,
    sourceUrls: [],
    costUsd: null,
    transport: 'gemini-generate-content',
    latencyMs: Date.now() - start,
  };
}

export function buildSecondPassRequest(input: {
  model: string;
  maxTokens: number;
  originalUserPrompt: string;
  firstRoundContent: string;
  userFeedback: string;
  temperature?: number;
}): ChatRequest {
  const feedback: ChatMessage = {
    role: 'user',
    content: [
      '아래는 1차 분석에 대한 사용자 피드백이다.',
      input.userFeedback,
      '1차 분석을 유지한 채 피드백을 반영한 2차 검토를 작성하라.',
      '웹 검색은 이 호출에 없다. 출처 URL이 없으면 출처는 없는 상태다.',
    ].join('\n'),
  };
  return {
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
    messages: [
      { role: 'user', content: input.originalUserPrompt },
      { role: 'assistant', content: input.firstRoundContent },
      feedback,
    ],
  };
}

function toPreservedRound(
  round: 1 | 2,
  response: ChatResponse,
  requestedAt: string,
): PreservedAnalysisRound {
  if (response.transport !== 'gemini-generate-content') {
    throw new AIProviderError(
      'Refusing to store a response that did not come from Gemini generateContent.',
      'google',
      502,
    );
  }
  if (
    response.content.includes('[Google Gemini stub]') ||
    response.content.includes('"stub":true')
  ) {
    throw new AIProviderError(
      'Refusing to store a stub response as an analysis round.',
      'google',
      502,
    );
  }
  return {
    round,
    model: response.model,
    content: response.content,
    usageKnown: response.usageKnown === true,
    usage: response.usageKnown === true ? response.usage : null,
    liveModelCall: true,
    groundingUsed: false,
    sourceUrls: [],
    costUsd: null,
    finishReason: response.finishReason,
    requestedAt,
  };
}

/**
 * Keeps round 1 and round 2 as separate objects.
 * The journey screen and the database do not call this function.
 */
export async function runPreservedGeminiPasses(
  chat: (request: ChatRequest) => Promise<ChatResponse>,
  input: {
    model: string;
    maxTokens: number;
    originalUserPrompt: string;
    userFeedback: string;
    requestedAt: string;
    temperature?: number;
  },
): Promise<{
  first: PreservedAnalysisRound;
  second: PreservedAnalysisRound;
  secondRequest: ChatRequest;
}> {
  const firstResponse = await chat({
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
    messages: [{ role: 'user', content: input.originalUserPrompt }],
  });
  const first = toPreservedRound(1, firstResponse, input.requestedAt);
  const secondRequest = buildSecondPassRequest({
    model: input.model,
    maxTokens: input.maxTokens,
    temperature: input.temperature,
    originalUserPrompt: input.originalUserPrompt,
    firstRoundContent: first.content,
    userFeedback: input.userFeedback,
  });
  const secondResponse = await chat(secondRequest);
  const second = toPreservedRound(2, secondResponse, input.requestedAt);
  return { first, second, secondRequest };
}
