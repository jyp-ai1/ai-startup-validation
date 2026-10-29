import { OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import {
  AI_PM_FIRST_PROMPT_VERSION,
  AI_PM_REVIEW_FIRST_MAX_TOKENS,
  AI_PM_REVIEW_INPUT_TOKEN_BUDGET,
  AI_PM_REVIEW_MODEL,
  buildFirstReviewRequest,
  clampReviewText,
  estimateReviewTokens,
  readGptApiKey,
} from './ai-pm-review';
import { composeReviewInput } from './ai-pm-review-intake';

/** CEO brewery text from comparison-sources/juinjip11-input.txt. */
export const COMPARE_BUSINESS_BODY =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.';

export const COMPARE_BUSINESS_INPUT = composeReviewInput({
  text: COMPARE_BUSINESS_BODY,
  purpose: 'overall',
});

export const QUALITY3_PROMPT_VERSION = 'quality-3-draft';

/** CPO draft. Not the product prompt. Sent in full by this harness, not by buildFirstReviewRequest. */
export const QUALITY3_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-3.',
  '당신은 초기 창업자의 사업 성공 가능성을 높이기 위한 전략 파트너다. 사업 아이디어를 요약하는 데 그치지 말고, 사업이 성립하기 위한 조건, 이를 뒷받침하는 근거, 가장 큰 불확실성과 우선 검증 행동을 분석한다.',
  '[분석 원칙]',
  '1. 사용자가 제공한 사업 내용을 바탕으로 핵심 고객, 해결하려는 문제, 제공 가치, 기존 대안, 차별화 가설 및 사업의 작동 구조를 구체적으로 재구성한다.',
  '2. 고객, 문제, 가치, 이용자와 지불자, 수익 구조, 시장, 경쟁, 대안, 차별화, 운영, 수익성 및 위험을 검토한다. 입력으로 판단할 수 없는 항목은 관련 정보가 없다고 명시하고, 확인에 필요한 정보를 설명한다.',
  '3. 사실, 추론, 가설, 미확인 정보를 구분한다. 사용자 입력에 없는 계약, 고객 확보, 매출, 시장 규모, 가격, 수수료, 참가비, 파트너십을 사실로 만들지 않는다. 가능한 수익 모델은 가설로 제시하고 지불자, 지불 이유, 성립 조건을 구분한다.',
  '4. 사업성 판단은 긍정·부정 표현만으로 결정하지 않는다. 고객 문제의 명확성, 고객 접근 가능성, 지불 주체와 수익 구조, 공급 확보, 운영 가능성, 차별화 및 핵심 가정의 검증 수준을 근거로 조건부 판단을 내린다. 정보 부족은 사업 실패의 증거로 취급하지 않는다.',
  '5. 여러 사업 모델이 가능하면 주요 후보를 비교한다. 각 후보의 고객, 지불자, 필요한 역량, 핵심 가정 및 가장 저렴한 검증 방법을 구분한다. 근거 없는 시장 수치나 재무 전망을 만들지 않는다.',
  '6. assumptions는 사업 성립에 영향을 크게 주는 미검증 가정 1~3개로 제한한다. 각 가정은 검증 가능한 형태로 표현한다.',
  '7. risks는 사업 실행을 방해할 수 있는 구체적 위험을 제시한다. evidenceToChange는 어떤 증거가 확보되면 현재 판단이나 우선순위를 변경할지 설명한다.',
  '8. nextVerification은 우선순위가 가장 높은 가정을 적은 비용으로 확인할 행동을 제시한다. 가능한 경우 검증 대상, 실행 방법, 관찰할 결과 및 그 결과가 판단에 미치는 영향을 포함한다.',
  '[첫 피드백 질문]',
  '9. 분석을 마친 뒤, 다음 단계의 사업 판단을 가장 크게 바꿀 미확인 가정 하나를 선정해 질문한다.',
  '10. 질문 후보는 해당 사업에 맞춰 고객 수요, 지불 구조, 공급 확보, 고객 획득, 운영 가능성, 차별화 또는 다른 핵심 불확실성에서 검토한다. 모든 사업에 같은 범주를 강제하거나 결제 여부를 우선 질문하지 않는다.',
  '11. 질문은 현재 사업의 실제 의사결정 갈림길을 드러내야 한다. 창업자가 이미 제공한 정보를 다시 묻지 않는다. 아직 정보가 없는 경우에는 그 정보의 중요성을 설명하고, 창업자가 알고 있는 사실과 아직 검증하지 못한 상태를 구분할 수 있게 한다.',
  '12. choices는 3~5개로 구성한다. 각 선택지는 서로 다른 사업적 상황이나 방향을 나타내야 하며, 단순히 높다·낮다·미정처럼 정도만 달라서는 안 된다. 적절한 경우 아직 검증하지 못함과 기타 / 직접 입력을 포함한다. 선택지에 포함되지 않은 전제를 사실로 취급하지 않는다.',
  '13. nextQuestionReason에는 왜 이 질문이 다른 불확실성보다 우선하는지 설명한다. 질문과 선택지는 실제 사업 내용에 직접 연결한다.',
  '[출력 계약]',
  '14. 유효한 JSON 객체만 반환한다. 마크다운 코드 블록이나 JSON 외의 설명을 출력하지 않는다.',
  '15. 키는 다음과 같이 정확히 유지한다. summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.',
  '16. 모든 키를 포함하고, 근거가 없는 값은 임의로 채우지 않는다. founderFacts에는 입력에서 확인되는 정보만 기록한다. inferences에는 추론을 기록하고, 가설은 가설이라고 표시한다.',
  '17. judgment에는 예비 사업성 판단, 핵심 근거, 판단의 한계 및 판단을 바꿀 핵심 조건을 포함한다. summary는 원문을 충실하게 반영한 사업 설명으로 작성한다.',
  '18. 모델이나 공급사의 이름을 사업 분석 내용에 포함하지 않는다.',
].join('\n');

const FULL_KEYS =
  'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices.';

export type CompareConfounder = {
  id: 'user_key_list' | 'product_input_clamp';
  detail: string;
};

export type CompareCallRecord = {
  promptVersion: string;
  status: 'succeeded' | 'failed' | 'not_run';
  completionId: string | null;
  requestId: string | null;
  model: string | null;
  finishReason: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  usageKnown: boolean;
  jsonParsed: boolean | null;
  error: string | null;
  systemPrompt: string;
  userPrompt: string;
  raw: string | null;
};

export type CompareReport = {
  status: 'RECORDED' | 'NOT RUN';
  reason: string | null;
  model: typeof AI_PM_REVIEW_MODEL;
  temperature: 0.2;
  maxTokens: typeof AI_PM_REVIEW_FIRST_MAX_TOKENS;
  responseFormat: 'json_object';
  businessInput: string;
  confounders: CompareConfounder[];
  productFollowUpInvoked: false;
  calls: CompareCallRecord[];
};

export function buildQuality2CompareRequest(): ChatRequest {
  return buildFirstReviewRequest(COMPARE_BUSINESS_INPUT);
}

export function buildQuality3CompareRequest(): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY3_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `사업 입력:\n${COMPARE_BUSINESS_INPUT}\n\n키: ${FULL_KEYS}\n검토 목적, 현재 단계, 가장 알고 싶은 것이 있으면 질문과 판단을 그 목적에 맞춘다. 원문에 없는 수익 항목은 가설로 적는다.`,
      },
    ],
  };
}

export function compareConfounders(): CompareConfounder[] {
  const quality2 = buildQuality2CompareRequest();
  const quality3 = buildQuality3CompareRequest();
  const quality2User = quality2.messages.find((message) => message.role === 'user')?.content ?? '';
  const quality3User = quality3.messages.find((message) => message.role === 'user')?.content ?? '';
  const clamped = clampReviewText(quality3User, AI_PM_REVIEW_INPUT_TOKEN_BUDGET - estimateReviewTokens(QUALITY3_SYSTEM_PROMPT));
  return [
    {
      id: 'user_key_list',
      detail: quality2User.includes('alternatives, differentiation')
        ? 'quality-2 사용자 키 목록에도 alternatives, differentiation이 있다.'
        : 'quality-2 사용자 키 목록에는 alternatives, differentiation이 없고 quality-3 사용자 키 목록에는 있다. 응답 차이를 시스템 지시만의 효과로 단정하지 않는다.',
    },
    {
      id: 'product_input_clamp',
      detail:
        clamped === quality3User
          ? 'quality-3를 제품 입력 예산에 넣어도 사용자 문장이 잘리지 않는다.'
          : `quality-3 시스템 문장을 제품 buildFirstReviewRequest 예산에 넣으면 사용자 문장이 ${quality3User.length}자에서 ${clamped.length}자로 잘린다. 이 비교 호출은 그 자르기를 쓰지 않고 전문을 보낸다.`,
    },
  ];
}

export async function executeQualityCompare(env: Record<string, string | undefined> = process.env): Promise<CompareReport> {
  const quality2 = buildQuality2CompareRequest();
  const quality3 = buildQuality3CompareRequest();
  const base = {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2 as const,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: 'json_object' as const,
    businessInput: COMPARE_BUSINESS_INPUT,
    confounders: compareConfounders(),
    productFollowUpInvoked: false as const,
  };
  const apiKey = readGptApiKey(env);
  if (!apiKey) {
    return {
      ...base,
      status: 'NOT RUN',
      reason: 'GPT_API_KEY missing',
      calls: [notRunCall(AI_PM_FIRST_PROMPT_VERSION, quality2), notRunCall(QUALITY3_PROMPT_VERSION, quality3)],
    };
  }
  const chat = (request: ChatRequest) => new OpenAIProviderAdapter({ apiKey }).chat(request);
  return {
    ...base,
    status: 'RECORDED',
    reason: null,
    calls: [
      await oneCall(chat, AI_PM_FIRST_PROMPT_VERSION, quality2),
      await oneCall(chat, QUALITY3_PROMPT_VERSION, quality3),
    ],
  };
}

function notRunCall(promptVersion: string, request: ChatRequest): CompareCallRecord {
  return {
    promptVersion,
    status: 'not_run',
    completionId: null,
    requestId: null,
    model: null,
    finishReason: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    usageKnown: false,
    jsonParsed: null,
    error: null,
    systemPrompt: messageContent(request, 'system'),
    userPrompt: messageContent(request, 'user'),
    raw: null,
  };
}

async function oneCall(
  chat: (request: ChatRequest) => Promise<ChatResponse>,
  promptVersion: string,
  request: ChatRequest,
): Promise<CompareCallRecord> {
  const prompts = {
    systemPrompt: messageContent(request, 'system'),
    userPrompt: messageContent(request, 'user'),
  };
  try {
    const response = await chat(request);
    const raw = response.content ?? '';
    return {
      promptVersion,
      status: raw.trim() ? 'succeeded' : 'failed',
      completionId: response.id,
      requestId: null,
      model: response.model,
      finishReason: response.finishReason,
      promptTokens: response.usageKnown ? response.usage.inputTokens : null,
      completionTokens: response.usageKnown ? response.usage.outputTokens : null,
      totalTokens: response.usageKnown ? response.usage.totalTokens : null,
      usageKnown: response.usageKnown === true,
      jsonParsed: jsonObject(raw),
      error: raw.trim() ? null : 'empty_response',
      ...prompts,
      raw,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'model_error';
    return {
      promptVersion,
      status: 'failed',
      completionId: null,
      requestId: requestIdFrom(message),
      model: request.model,
      finishReason: null,
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      usageKnown: false,
      jsonParsed: false,
      error: message.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]').slice(0, 300),
      ...prompts,
      raw: null,
    };
  }
}

function messageContent(request: ChatRequest, role: 'system' | 'user'): string {
  return request.messages.find((message) => message.role === role)?.content ?? '';
}

function jsonObject(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Boolean(parsed) && typeof parsed === 'object' && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

function requestIdFrom(message: string): string | null {
  const found = message.match(/request_id=([^\s]+)/);
  return found?.[1] ?? null;
}
