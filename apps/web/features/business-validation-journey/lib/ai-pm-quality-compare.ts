import { OpenAIProviderAdapter, type ChatRequest, type ChatResponse } from '@repo/ai';

import {
  AI_PM_FIRST_PROMPT_VERSION,
  AI_PM_REVIEW_FIRST_MAX_TOKENS,
  AI_PM_REVIEW_INPUT_TOKEN_BUDGET,
  AI_PM_REVIEW_MODEL,
  buildFirstReviewRequest,
  clampReviewText,
  estimateReviewTokens,
  parseSections,
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

export const QUALITY4_PROMPT_VERSION = 'quality-4-draft';

/**
 * Question-design draft from the stored brewery outputs and the CEO GPT review.
 * Not the product prompt. The preview compare fixture does not send it.
 */
export const QUALITY4_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-4.',
  '당신은 초기 창업자의 사업성 검토를 돕는 전략 파트너다. 요약으로 끝내지 않는다. 입력에 있는 사실만 사실로 적고, 사업이 성립하려면 무엇이 맞아야 하는지와 그 답을 가장 크게 바꾸는 질문 하나를 만든다.',
  '[이해]',
  '1. summary는 입력의 고객, 경험, 공급자, 지원하려는 활동을 빠뜨리지 않고 옮긴다. 입력에 없는 상품 구성이나 지역을 보태지 않는다.',
  '2. 경험을 사는 사람과 돈을 낼 수 있는 사람이 다르면 customer와 payer를 나눈다. 입력에 지불자가 없으면 payer는 미확인이라고 적는다.',
  '3. founderFacts에는 입력 문장으로 확인되는 내용만 적는다. inferences에는 추론이라고 적는다. 입력에 없는 가격, 매출, 인원, 시장 규모, 수수료, 참가비, 제휴 확정은 사실로 쓰지 않는다. 가능한 수익은 revenueModel에 가설이라고 적고, 누가 왜 내며 어떤 조건에서 성립하는지를 구분한다.',
  '[판단]',
  '4. 여러 판매 방식이 가능하면 후보를 나눈다. 각 후보의 고객, 지불자, 필요한 공급, 아직 확인하지 못한 가정을 적는다. 외부 사례나 가격을 끌어와 수요가 증명된 것처럼 쓰지 않는다.',
  '5. judgment는 예비 판단, 그 근거, 판단의 한계, 판단을 바꿀 조건이다. 정보 부족을 실패의 증거로 쓰지 않는다.',
  '6. assumptions는 성립을 좌우하는 미검증 가정 1~3개다. nextVerification은 그 중 첫 질문과 같은 가정을 적은 비용으로 확인하는 행동이다. 전국 플랫폼 개발이나 대규모 조사는 첫 확인이 아니다.',
  '[첫 질문]',
  '7. nextQuestion은 다음 판단을 가장 크게 바꾸는 미확인 가정 하나다. 협력·수요·가능성이 높다, 낮다, 미정인지만 묻지 않는다. 모든 사업에 결제 의사나 파트너십을 첫 질문으로 두지 않는다.',
  '8. 입력이 이용하는 사람과 지원하려는 공급자를 함께 말하면, 질문은 무엇을 먼저 팔지를 가른다. 공급자에게 지원을 파는지, 이용자에게 경험을 파는지, 둘을 한 상품으로 묶는지가 선택지에 드러나야 한다. 창업자가 이미 쓴 사실을 다시 묻지 않는다.',
  '9. choices는 3~5개다. 선택지는 서로 다른 고객, 지불자, 상품 또는 운영 방식이어야 한다. 정도만 다른 선택지는 금지한다. 아직 정하지 못함과 기타 / 직접 입력을 포함한다.',
  '10. nextQuestionReason은 이 답이 수익 구조나 다음 검증을 어떻게 바꾸는지 한 문장으로 적는다.',
  '[출력]',
  '11. JSON 객체만 반환한다. 키는 summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices 이다.',
  '12. 모델이나 공급사 이름은 쓰지 않는다.',
].join('\n');

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

export const QUALITY5_PROMPT_VERSION = 'quality-5-cpo-draft';

/** Same key list in the quality-5 system text and the quality-5 user text. */
export const QUALITY5_OUTPUT_KEYS =
  'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, judgment, nextVerification, nextQuestion, nextQuestionReason, choices';

/**
 * CPO candidate for this brewery review. Not the product prompt.
 * The product route keeps buildFirstReviewRequest on quality-2.
 * A missing key or invalid JSON stays unparsed. parseSections returns null,
 * and the product stores that as unstructured_response. Fees and figures
 * absent from the input are marked by markUnsourcedClaims and scrubFigures.
 */
export const QUALITY5_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-5-cpo-draft.',
  '당신은 초기 창업자의 1차 사업성 검토를 돕는 전략 파트너다. 요약으로 끝내지 않는다.',
  '[보존]',
  '1. summary는 입력에 있는 사업 축을 빠뜨리지 않는다. 이용자가 경험하는 활동과 공급자에 대한 지원이 함께 있으면 둘 다 적는다.',
  '2. 입력에 없는 상품 판매, 계약, 제휴, 지역, 가격을 이미 결정된 사실로 추가하지 않는다.',
  '[사실]',
  '3. founderFacts에는 입력 문장으로 확인되는 내용만 적는다.',
  '4. inferences에는 추론이라고 표시한다.',
  '5. assumptions는 사업 성립을 좌우하는 미검증 가정 1~3개다.',
  '6. revenueModel에서 입력에 없는 수익원은 가설이라고 적고, 누가 왜 낼 수 있는지를 가정으로 구분한다. 시장 통계, 가격, 수수료, 매출, 계약을 근거 없이 만들지 않는다.',
  '7. customer는 경험을 쓰는 이용자다. payer는 돈을 낼 수 있는 주체다. 입력에 지불자가 없으면 payer는 미확인이라고 적는다.',
  '[질문]',
  '8. nextQuestion은 하나다. 다음 의사결정을 바꾸는 미확인 가정 하나만 묻는다. 협력·수요·가능성이 높다, 낮다, 미정인지만 묻지 않는다.',
  '9. 입력이 이용자 경험과 공급자 지원을 함께 말하면, choices는 그 사업의 말로 다음을 구분한다. 이용자 경험을 먼저 검증. 공급자 지원을 먼저 검증. 둘을 결합한 모델을 검증. 아직 우선순위를 결정하지 못함. 기타 / 직접 입력.',
  '10. 그 구분은 두 축이 함께 있는 사업에만 쓴다. 두 축이 없는 사업에는 그 문장을 붙이지 않고, 그 사업의 고객, 지불자, 상품, 운영이 갈라지는 선택지를 만든다.',
  '11. nextQuestionReason은 이 질문 하나를 먼저 묻는 이유다. nextVerification은 그 가정을 적은 비용으로 확인하는 행동이다.',
  '12. nextQuestion은 choices가 구분하는 사업 방향 또는 검증 우선순위를 직접 묻는 질문이어야 한다. 질문과 선택지는 같은 의사결정에 대응해야 하며, 선택지에 없는 방향을 질문하거나 질문에 답해도 선택지 중 하나를 고를 수 없는 구조를 만들지 않는다. 각 선택지는 서로 구별되는 검증 방향이어야 하고, 입력에 없는 사실을 전제로 하지 않는다.',
  '[출력]',
  '13. JSON 객체만 반환한다. JSON 밖에 설명이나 마크다운을 쓰지 않는다.',
  `14. 키는 다음만 사용하고 모두 포함한다. ${QUALITY5_OUTPUT_KEYS}.`,
  '15. summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다. 입력으로 채울 수 없으면 미확인이라고 적는다.',
  '16. strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다. choices는 3~5개다.',
  '17. 모델이나 공급사 이름은 쓰지 않는다.',
].join('\n');

export function buildQuality5CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY5_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `사업 입력:\n${text}\n\n프롬프트 버전 ${QUALITY5_PROMPT_VERSION}.\n키: ${QUALITY5_OUTPUT_KEYS}.\n시스템 지시의 키와 같다. 문자열 키는 문자열, 배열 키는 배열로 둔다. choices는 3~5개의 문자열이다.\n검토 목적, 현재 단계, 가장 알고 싶은 것이 있으면 질문과 판단을 그 목적에 맞춘다. 원문에 없는 수익 항목은 가설로 적는다.`,
      },
    ],
  };
}

export type SprintGateStatus = 'pass' | 'fail' | 'not_run';

export type SprintGateResult = {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5' | 'Q6' | 'Q7' | 'Q8' | 'Q9' | 'Q10';
  status: SprintGateStatus;
  evidence: string;
};

/** Scores a stored model string. A missing string stays not_run. This does not call a model. */
export function scoreSprintGates(raw: string | null, sourceText: string): SprintGateResult[] {
  if (!raw?.trim()) {
    return (['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Q9', 'Q10'] as const).map((id) => ({
      id,
      status: 'not_run' as const,
      evidence: '모델 응답 원문 없음',
    }));
  }
  const sections = parseSections(raw, sourceText);
  const analysis = sections?.analysis ?? null;
  const summary = analysis?.summary ?? '';
  const choices = analysis?.choices.map((choice) => choice.label) ?? [];
  const choiceText = choices.join('\n');
  const keepsExperience = /체험|만들고|마시고/.test(summary);
  const keepsMarketing = /마케팅/.test(summary);
  const fee = /수수료|참가비/.test(raw) && !sourceText.includes('수수료') && !/가설|확인되지|원문에 없/.test(raw);
  const payer = analysis?.payer ?? '';
  const customer = sections?.customer ?? '';
  const mixedDemand = /수요가 입증|검증된 수요|시장이 증명/.test(raw) && !/가설|사례|미확인/.test(raw);
  const oneQuestion = Boolean(sections?.nextQuestion) && !raw.includes('1. 사업의 핵심 수익원');
  const reason = Boolean(sections?.nextQuestionReason);
  const directions = [
    /체험/.test(choiceText),
    /마케팅/.test(choiceText),
    /결합|함께|둘/.test(choiceText),
    /아직|정하지 못/.test(choiceText),
    /기타|직접 입력/.test(choiceText),
  ];
  const polarity = /협력 가능성/.test(sections?.nextQuestion ?? '') && /높다/.test(choiceText) && /낮다/.test(choiceText);
  return [
    {
      id: 'Q1',
      status: analysis ? (keepsExperience && keepsMarketing ? 'pass' : 'fail') : 'not_run',
      evidence: analysis ? summary : '파싱된 summary 없음',
    },
    {
      id: 'Q2',
      status: fee ? 'fail' : 'pass',
      evidence: fee ? '원문에 없는 수수료 또는 참가비가 가설 없이 있다.' : '가설 없는 수수료·참가비 단정이 보이지 않는다.',
    },
    {
      id: 'Q3',
      status: analysis ? (payer.includes('미확인') || (payer !== customer && /양조|지불|부담/.test(payer)) ? 'pass' : 'fail') : 'not_run',
      evidence: analysis ? `customer=${customer} payer=${payer}` : '파싱된 payer 없음',
    },
    {
      id: 'Q4',
      status: mixedDemand ? 'fail' : 'pass',
      evidence: mixedDemand ? '외부 수요를 이 사업의 검증된 수요처럼 적는다.' : '검증된 수요 단정 문구가 보이지 않는다.',
    },
    {
      id: 'Q5',
      status: analysis ? (polarity ? 'fail' : keepsExperience && keepsMarketing && /검증|먼저|우선/.test(`${sections?.nextQuestion ?? ''}\n${choiceText}`) ? 'pass' : 'fail') : 'not_run',
      evidence: sections?.nextQuestion ?? '질문 없음',
    },
    {
      id: 'Q6',
      status: analysis ? (directions.every(Boolean) && !polarity ? 'pass' : 'fail') : 'not_run',
      evidence: choiceText || '선택지 없음',
    },
    {
      id: 'Q7',
      status: analysis ? (oneQuestion && reason ? 'pass' : 'fail') : 'not_run',
      evidence: sections?.nextQuestionReason ?? '이유 없음',
    },
    {
      id: 'Q8',
      status: 'not_run',
      evidence: analysis ? '파서는 이 원문을 읽었다. 저장과 재조회는 이 함수가 하지 않는다.' : '파서가 사업 분석을 만들지 못했다. 저장·재조회는 실행하지 않았다.',
    },
    { id: 'Q9', status: 'not_run', evidence: '브라우저 새로고침·재인증을 실행하지 않았다.' },
    { id: 'Q10', status: 'not_run', evidence: '선택 저장과 후속 호출 부재를 브라우저에서 확인하지 않았다.' },
  ];
}

export function sprintGateSummary(results: SprintGateResult[]): 'FAIL' | 'BLOCKED' | 'NOT RUN' {
  const hard = results.filter((result) => result.id === 'Q1' || result.id === 'Q2' || result.id === 'Q5' || result.id === 'Q6');
  if (hard.some((result) => result.status === 'fail')) return 'FAIL';
  if (results.every((result) => result.status === 'not_run')) return 'NOT RUN';
  if (hard.some((result) => result.status === 'not_run') || results.some((result) => result.status !== 'pass')) return 'BLOCKED';
  return 'BLOCKED';
}

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

/** quality-2 and quality-5-cpo-draft only. Does not call the product follow-up. */
export async function executeSprintQualityPair(
  env: Record<string, string | undefined> = process.env,
): Promise<CompareReport> {
  const quality2 = buildQuality2CompareRequest();
  const quality5 = buildQuality5CompareRequest();
  const base = {
    model: AI_PM_REVIEW_MODEL as typeof AI_PM_REVIEW_MODEL,
    temperature: 0.2 as const,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS as typeof AI_PM_REVIEW_FIRST_MAX_TOKENS,
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
      calls: [notRunCall(AI_PM_FIRST_PROMPT_VERSION, quality2), notRunCall(QUALITY5_PROMPT_VERSION, quality5)],
    };
  }
  const chat = (request: ChatRequest) => new OpenAIProviderAdapter({ apiKey }).chat(request);
  return {
    ...base,
    status: 'RECORDED',
    reason: null,
    calls: [
      await oneCall(chat, AI_PM_FIRST_PROMPT_VERSION, quality2),
      await oneCall(chat, QUALITY5_PROMPT_VERSION, quality5),
    ],
  };
}

export async function executeQualityCompare(env: Record<string, string | undefined> = process.env): Promise<CompareReport> {
  const quality2 = buildQuality2CompareRequest();
  const quality3 = buildQuality3CompareRequest();
  const base = {
    model: AI_PM_REVIEW_MODEL as typeof AI_PM_REVIEW_MODEL,
    temperature: 0.2 as const,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS as typeof AI_PM_REVIEW_FIRST_MAX_TOKENS,
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
