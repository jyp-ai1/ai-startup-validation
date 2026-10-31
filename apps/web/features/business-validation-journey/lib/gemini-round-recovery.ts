import { AIProviderError, buildSecondPassRequest, type ChatRequest, type ChatResponse } from '@repo/ai';

import {
  openGeminiRoundStore,
  type GeminiRoundEvidence,
  type GeminiRoundRecord,
  type GeminiRoundStore,
} from './gemini-round-store';

export const GEMINI_E2E_MODEL = 'gemini-2.0-flash';

export const GEMINI_RECOVERY_PATH = {
  selected: 'official_generate_content',
  bookmarkReturnsReply: false,
  extensionReturnsReply: false,
  readsGeminiPage: false,
} as const;

export type GeminiChat = (request: ChatRequest) => Promise<ChatResponse>;

export function decideGeminiLiveCall(env: Record<string, string | undefined> = process.env):
  | { evidence: 'live_network' }
  | { evidence: 'not_run'; reason: string } {
  if (env.GEMINI_LIVE_CALL_APPROVED !== 'yes') {
    return { evidence: 'not_run', reason: 'Gemini live call is not approved. No request was sent.' };
  }
  if (!env.GOOGLE_AI_API_KEY?.trim()) {
    return { evidence: 'not_run', reason: 'GOOGLE_AI_API_KEY is missing. No request was sent.' };
  }
  const ceiling = env.GOOGLE_AI_MAX_OUTPUT_TOKENS?.trim();
  if (!ceiling || !/^[1-9]\d*$/.test(ceiling)) {
    return {
      evidence: 'not_run',
      reason: 'GOOGLE_AI_MAX_OUTPUT_TOKENS is missing. A missing ceiling is not a free call.',
    };
  }
  return { evidence: 'live_network' };
}

export function buildBusinessInquiry(input: {
  business: string;
  customer?: string;
  problem?: string;
}): string {
  return [
    '사업성 검토 질의이다. 이 호출은 웹 검색을 사용하지 않는다.',
    '확인한 출처 URL이 없으면 출처는 없는 상태라고 쓴다.',
    `사업: ${input.business.trim()}`,
    input.customer?.trim() ? `고객: ${input.customer.trim()}` : '',
    input.problem?.trim() ? `문제: ${input.problem.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function recoverGeminiRound(input: {
  store: GeminiRoundStore;
  userId: string;
  executionId: string;
  round: 1 | 2;
  business: string;
  customer?: string;
  problem?: string;
  feedback?: string;
  parentExecutionId?: string | null;
  now: string;
  maxTokens: number;
  evidence: GeminiRoundEvidence;
  notRunReason?: string;
  chat?: GeminiChat;
}): Promise<{ record: GeminiRoundRecord; duplicate: boolean; called: boolean }> {
  const existing = input.store.read(input.userId, input.executionId);
  if (existing) return { record: existing, duplicate: true, called: false };

  const businessInput = buildBusinessInquiry({
    business: input.business,
    customer: input.customer,
    problem: input.problem,
  });

  if (input.evidence === 'not_run') {
    const record = blankRecord(input, businessInput, {
      status: 'not_run',
      evidence: 'not_run',
      error: input.notRunReason ?? 'Gemini live call was not sent.',
      prompt: businessInput,
    });
    input.store.insert(record);
    return { record, duplicate: false, called: false };
  }

  if (!input.chat) {
    const record = blankRecord(input, businessInput, {
      status: 'failed',
      evidence: input.evidence,
      error: 'Gemini HTTP client is missing. No response text was created.',
      prompt: businessInput,
    });
    input.store.insert(record);
    return { record, duplicate: false, called: false };
  }

  let parent: GeminiRoundRecord | null = null;
  if (input.round === 2) {
    parent = input.parentExecutionId
      ? input.store.read(input.userId, input.parentExecutionId)
      : null;
    if (!parent || parent.status !== 'succeeded' || !parent.content) {
      const record = blankRecord(input, businessInput, {
        status: 'failed',
        evidence: input.evidence,
        error: '1차 원문이 없어 2차 질의를 보내지 않는다.',
        prompt: businessInput,
        parentExecutionId: input.parentExecutionId ?? null,
      });
      input.store.insert(record);
      return { record, duplicate: false, called: false };
    }
  }

  const request =
    input.round === 2 && parent?.content
      ? buildSecondPassRequest({
          model: GEMINI_E2E_MODEL,
          maxTokens: input.maxTokens,
          originalUserPrompt: parent.prompt,
          firstRoundContent: parent.content,
          userFeedback: input.feedback ?? '',
        })
      : {
          model: GEMINI_E2E_MODEL,
          maxTokens: input.maxTokens,
          messages: [{ role: 'user' as const, content: businessInput }],
        };
  const prompt = request.messages.map((message) => message.content).join('\n\n');

  try {
    const response = await input.chat(request);
    if (
      response.transport !== 'gemini-generate-content' ||
      response.content.includes('[Google Gemini stub]') ||
      response.content.includes('"stub":true')
    ) {
      const record = blankRecord(input, businessInput, {
        status: 'failed',
        evidence: input.evidence,
        error: 'Stub response refused. It was not stored as a Gemini original.',
        prompt,
        httpStatus: 502,
      });
      input.store.insert(record);
      return { record, duplicate: false, called: true };
    }
    if (!response.content.trim()) {
      const record = storedResponse(input, businessInput, prompt, response, 'result_missing');
      input.store.insert(record);
      return { record, duplicate: false, called: true };
    }
    const record = storedResponse(input, businessInput, prompt, response, 'succeeded');
    input.store.insert(record);
    return { record, duplicate: false, called: true };
  } catch (error) {
    const httpStatus = error instanceof AIProviderError ? error.statusCode : null;
    const message = error instanceof Error ? error.message : 'Gemini request failed.';
    const record = blankRecord(input, businessInput, {
      status: 'failed',
      evidence: input.evidence,
      error: message,
      prompt,
      httpStatus,
    });
    input.store.insert(record);
    return { record, duplicate: false, called: true };
  }
}

export function reopenGeminiRound(
  filePath: string,
  userId: string,
  executionId: string,
): GeminiRoundRecord | null {
  const store = openGeminiRoundStore(filePath);
  try {
    return store.read(userId, executionId);
  } finally {
    store.close();
  }
}

function storedResponse(
  input: {
    userId: string;
    executionId: string;
    round: 1 | 2;
    parentExecutionId?: string | null;
    feedback?: string;
    now: string;
    evidence: GeminiRoundEvidence;
  },
  businessInput: string,
  prompt: string,
  response: ChatResponse,
  status: 'succeeded' | 'result_missing',
): GeminiRoundRecord {
  return {
    userId: input.userId,
    executionId: input.executionId,
    round: input.round,
    parentExecutionId: input.parentExecutionId ?? null,
    businessInput,
    feedback: input.feedback ?? null,
    prompt,
    status,
    evidence: input.evidence,
    content: status === 'succeeded' ? response.content : null,
    model: response.model,
    requestedAt: input.now,
    finishedAt: input.now,
    error: status === 'result_missing' ? 'Gemini response had no text.' : null,
    httpStatus: 200,
    groundingUsed: false,
    sourceUrls: [],
    sourceStatus: 'absent',
    usageKnown: response.usageKnown === true,
    costUsd: null,
    verifiedFact: false,
  };
}

function blankRecord(
  input: {
    userId: string;
    executionId: string;
    round: 1 | 2;
    parentExecutionId?: string | null;
    feedback?: string;
    now: string;
  },
  businessInput: string,
  fields: {
    status: GeminiRoundRecord['status'];
    evidence: GeminiRoundEvidence;
    error: string;
    prompt: string;
    httpStatus?: number | null;
    parentExecutionId?: string | null;
  },
): GeminiRoundRecord {
  return {
    userId: input.userId,
    executionId: input.executionId,
    round: input.round,
    parentExecutionId: fields.parentExecutionId ?? input.parentExecutionId ?? null,
    businessInput,
    feedback: input.feedback ?? null,
    prompt: fields.prompt,
    status: fields.status,
    evidence: fields.evidence,
    content: null,
    model: null,
    requestedAt: input.now,
    finishedAt: input.now,
    error: fields.error,
    httpStatus: fields.httpStatus ?? null,
    groundingUsed: false,
    sourceUrls: [],
    sourceStatus: 'absent',
    usageKnown: false,
    costUsd: null,
    verifiedFact: false,
  };
}
