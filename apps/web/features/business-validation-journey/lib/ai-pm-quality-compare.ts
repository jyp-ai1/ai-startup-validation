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
  reviewContractError,
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

export const QUALITY6_PROMPT_VERSION = 'quality-6-cpo-draft';

export const QUALITY6_BREWERY_CHOICES = [
  '관광객 대상 양조장 체험 상품을 먼저 검증',
  '양조장 대상 온라인 마케팅 지원을 먼저 검증',
  '체험과 마케팅 지원을 결합한 모델을 먼저 검증',
  '아직 우선순위를 결정하지 못함',
  '기타 / 직접 입력',
] as const;

/** Short candidate. The decision list is in the user message, and only for an input that has both axes. */
export const QUALITY6_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-6-cpo-draft.',
  'JSON 객체만 반환한다.',
  `키는 ${QUALITY5_OUTPUT_KEYS} 이다.`,
  'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다.',
  'strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다.',
  'founderFacts는 입력 문장만 적는다. inferences에는 추론이라고 적는다. assumptions는 1~3개다.',
  'revenueModel은 수익 항목을 나눈다. 입력에 없는 참가비, 수수료, 수익 공유, 마케팅 서비스 수수료는 항목마다 가설: 로 시작한다. 다른 항목에 적힌 가설: 은 이 항목의 표시가 아니다. 입력에 적힌 수익만 사실로 적는다. 가격, 매출, 계약, 제휴 확정은 만들지 않는다.',
  'customer는 이용자다. payer는 비용을 내는 주체다. 입력에 지불자가 없으면 payer는 미확인이다. 이용자를 지불자로 쓰지 않는다. 공급자가 낸다는 말도 사실로 쓰지 않는다.',
  'nextQuestion은 하나다. 협력 가능성이 높다, 낮다, 미정인지만 묻지 않는다. 질문과 choices는 같은 결정이다. 선택지에 없는 방향을 묻지 않는다.',
  '모델이나 공급사 이름은 쓰지 않는다.',
].join('\n');

export function quality6DecisionBlock(text: string): string {
  const experience = /체험|만들고|마시고/.test(text);
  const support = /마케팅/.test(text);
  const revenue =
    '입력에 없는 참가비, 수수료, 수익 공유, 마케팅 서비스 수수료는 revenueModel에서 항목마다 가설: 로 시작한다. 입력에 적힌 수익은 사실로 적는다. 입력에 지불자가 없으면 payer는 미확인이다.';
  if (experience && support && /양조장/.test(text)) {
    return [
      '이 입력은 관광객 양조장 체험과 양조장 온라인 마케팅 지원이 함께 있다.',
      'nextQuestion은 무엇을 먼저 검증할 것인가? 만 쓴다.',
      `choices는 ${JSON.stringify([...QUALITY6_BREWERY_CHOICES])} 만 쓴다.`,
      '협력 가능성이 높다, 낮다, 미정은 쓰지 않는다.',
      revenue,
    ].join('\n');
  }
  if (experience && support) {
    return [
      '이 입력은 이용자 경험과 공급자 지원이 함께 있다.',
      'nextQuestion은 무엇을 먼저 검증할 것인가? 만 쓴다.',
      'choices는 입력의 경험, 입력의 지원, 둘의 결합, 아직 우선순위를 결정하지 못함, 기타 / 직접 입력만 쓴다.',
      '양조장 체험 상품과 양조장 마케팅 지원이라는 문구는 입력에 없으면 쓰지 않는다. 높다, 낮다는 쓰지 않는다.',
      revenue,
    ].join('\n');
  }
  return [
    '이 입력에는 이용자 경험과 공급자 지원이 함께 있지 않다.',
    '체험을 먼저 검증, 마케팅 지원을 먼저 검증, 결합 모델의 다섯 선택지를 쓰지 않는다.',
    '질문은 이 입력의 고객, 지불자, 운영이 갈라지는 검증 하나다. 높다, 낮다는 쓰지 않는다.',
    revenue,
  ].join('\n');
}

export function buildQuality6CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY6_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `사업 입력:\n${text}\n\n프롬프트 버전 ${QUALITY6_PROMPT_VERSION}.\n키: ${QUALITY5_OUTPUT_KEYS}.\n${quality6DecisionBlock(text)}`,
      },
    ],
  };
}

export const QUALITY7_PROMPT_VERSION = 'quality-7-cpo-draft';

export const QUALITY7_REVENUE_ITEMS = ['체험 참가비', '수수료', '수익 공유', '마케팅 서비스 수수료'] as const;

/** A fee word inside the marketing-fee phrase does not count as its own stated fee. */
export function revenueItemStated(text: string, item: (typeof QUALITY7_REVENUE_ITEMS)[number]): boolean {
  if (item === '수수료') return text.replace(/마케팅 서비스 수수료/g, '').includes('수수료');
  if (item === '체험 참가비') return text.includes('참가비');
  return text.includes(item);
}

/** One string. Each item carries its own 가설 or 사실 mark. */
export function quality7RevenueString(text: string): string {
  return QUALITY7_REVENUE_ITEMS.map((item) =>
    revenueItemStated(text, item) ? `사실: ${item} — 입력에 있다.` : `가설: ${item} — 입력에 없다.`,
  ).join(' ');
}

export const QUALITY7_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-7-cpo-draft.',
  'JSON 객체만 반환한다.',
  `키는 ${QUALITY5_OUTPUT_KEYS} 이다.`,
  'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다.',
  'strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다.',
  'revenueModel의 JSON 타입은 string이다. 객체, 배열, 숫자로 쓰지 않는다.',
  '입력에 없는 체험 참가비, 수수료, 수익 공유, 마케팅 서비스 수수료는 그 문자열 안에서 항목마다 가설: 로 시작한다. 한 항목의 가설: 은 다른 항목에 적용되지 않는다. 입력에 적힌 수익만 사실: 로 시작한다.',
  'customer는 이용자다. payer는 비용을 내는 주체다. 입력에 지불자가 없으면 payer는 미확인이다. 이용자를 지불자로 쓰지 않는다.',
  'nextQuestion은 하나다. 협력 가능성이 높다, 낮다, 미정인지만 묻지 않는다. 질문과 choices는 같은 결정이다.',
  '모델이나 공급사 이름은 쓰지 않는다.',
].join('\n');

export function quality7UserBlock(text: string): string {
  const choiceLines = quality6DecisionBlock(text)
    .split('\n')
    .filter((line) => !line.startsWith('입력에 없는 참가비'));
  return [
    ...choiceLines,
    '입력에 지불자가 없으면 payer는 미확인이다. 이용자를 지불자로 쓰지 않는다.',
    'revenueModel의 JSON 타입은 string이다. 객체, 배열, 숫자로 쓰지 않는다.',
    `revenueModel 값은 다음 문자열만 쓴다. ${quality7RevenueString(text)}`,
    '각 가설: 과 사실: 은 바로 뒤의 항목 하나에만 적용된다.',
    'operatingModel은 구상이며 결합 모델을 확정 사실로 쓰지 않는다.',
  ].join('\n');
}

export function buildQuality7CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY7_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `사업 입력:\n${text}\n\n프롬프트 버전 ${QUALITY7_PROMPT_VERSION}.\n키: ${QUALITY5_OUTPUT_KEYS}.\n문자열 키는 문자열이고 revenueModel도 문자열이다.\n${quality7UserBlock(text)}`,
      },
    ],
  };
}

/** Item marks on a stored string. A missing raw stays unchecked. This does not call a model. */
export function scoreRevenueContract(
  raw: string | null,
  sourceText: string,
): { typeOk: boolean; itemsOk: boolean; detail: string } {
  if (!raw?.trim()) return { typeOk: false, itemsOk: false, detail: '원문 없음' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { typeOk: false, itemsOk: false, detail: 'JSON이 아니다' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { typeOk: false, itemsOk: false, detail: 'JSON 객체가 아니다' };
  }
  const value = (parsed as Record<string, unknown>).revenueModel;
  if (typeof value !== 'string') {
    return { typeOk: false, itemsOk: false, detail: `revenueModel 타입은 ${value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value}` };
  }
  const missing = QUALITY7_REVENUE_ITEMS.filter((item) => {
    const marker = revenueItemStated(sourceText, item) ? `사실: ${item}` : `가설: ${item}`;
    return !value.includes(marker);
  });
  return { typeOk: true, itemsOk: missing.length === 0, detail: missing.length ? `표시 없는 항목: ${missing.join(', ')}` : value };
}

export const QUALITY8_PROMPT_VERSION = 'quality-8-cpo-draft';

const INVENTED_TRAITS = ['산업 경험', '운영 관리', '마케팅 능력', '네트워크', '관심 증가', '주류 산업'] as const;

/** Sentences before the intake lines. Intake labels are not founder facts. */
export function quality8FounderFacts(text: string): string[] {
  const body = text.split(/\n\s*검토 목적:/)[0]?.trim() ?? '';
  const pieces = body
    .split(/(?<=다\.)\s+/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  return pieces.length > 0 ? pieces : body ? [body] : [];
}

export function quality8EvidenceBlock(text: string): string {
  const facts = quality8FounderFacts(text);
  const body = text.split(/\n\s*검토 목적:/)[0] ?? text;
  const strengths = body.includes('강점')
    ? 'strengths는 입력에서 강점이라고 적은 문장만 쓴다.'
    : 'strengths는 ["미확인"] 만 쓴다.';
  return [
    `founderFacts는 ${JSON.stringify(facts)} 만 쓴다.`,
    '입력에 없는 경력, 능력, 네트워크는 founderFacts에 쓰지 않는다.',
    strengths,
    '관심 증가는 입력에 없으면 strengths에 쓰지 않는다.',
    'inferences의 각 문자열은 추론: 으로 시작하고 founderFacts의 문장 하나를 그대로 포함한다.',
    '추론을 founderFacts나 검증된 시장 사실로 옮기지 않는다.',
  ].join('\n');
}

export const QUALITY8_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-8-cpo-draft.',
  ...QUALITY7_SYSTEM_PROMPT.split('\n').slice(1),
  'founderFacts는 입력 문장만 담는다. 입력에 없는 경력, 능력, 네트워크는 쓰지 않는다.',
  'strengths에 입력에 없는 시장 관심 증가를 강점으로 쓰지 않는다. 근거가 없으면 미확인이다.',
  'inferences의 각 문자열은 추론: 으로 시작한다. 추론을 창업자 사실로 쓰지 않는다.',
].join('\n');

export function buildQuality8CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  const quality7 = buildQuality7CompareRequest(text);
  const priorUser = (quality7.messages[1]?.content ?? '').replace(
    `프롬프트 버전 ${QUALITY7_PROMPT_VERSION}.`,
    `프롬프트 버전 ${QUALITY8_PROMPT_VERSION}.`,
  );
  return {
    ...quality7,
    messages: [
      { role: 'system', content: QUALITY8_SYSTEM_PROMPT },
      { role: 'user', content: `${priorUser}\n${quality8EvidenceBlock(text)}` },
    ],
  };
}

/** Founder facts, strengths, and inference marks. This does not call a model. */
export function scoreEvidenceIntegrity(
  raw: string | null,
  sourceText: string,
): { founderFactsOk: boolean; strengthsOk: boolean; inferencesOk: boolean; detail: string } {
  if (!raw?.trim()) {
    return { founderFactsOk: false, strengthsOk: false, inferencesOk: false, detail: '원문 없음' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { founderFactsOk: false, strengthsOk: false, inferencesOk: false, detail: 'JSON이 아니다' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { founderFactsOk: false, strengthsOk: false, inferencesOk: false, detail: 'JSON 객체가 아니다' };
  }
  const record = parsed as Record<string, unknown>;
  const facts = Array.isArray(record.founderFacts) ? record.founderFacts.filter((item): item is string => typeof item === 'string') : [];
  const strengths = Array.isArray(record.strengths) ? record.strengths.filter((item): item is string => typeof item === 'string') : [];
  const inferences = Array.isArray(record.inferences) ? record.inferences.filter((item): item is string => typeof item === 'string') : [];
  const source = sourceText.replace(/\s+/g, '');
  const invented = INVENTED_TRAITS.filter((trait) => !sourceText.includes(trait));
  const founderFactsOk =
    facts.length > 0 &&
    facts.every((fact) => source.includes(fact.replace(/\s+/g, '')) && !invented.some((trait) => fact.includes(trait)));
  const strengthsOk =
    strengths.length > 0 &&
    strengths.every((item) => item === '미확인' || item.includes('가설') || source.includes(item.replace(/\s+/g, ''))) &&
    !strengths.some((item) => invented.some((trait) => factIncludes(item, trait) && item !== '미확인' && !item.includes('가설')));
  const allowed = quality8FounderFacts(sourceText);
  const inferencesOk =
    inferences.length > 0 &&
    inferences.every(
      (item) => item.startsWith('추론:') && allowed.some((fact) => item.includes(fact)) && !invented.some((trait) => item.includes(trait)),
    );
  const detail = [
    founderFactsOk ? 'founderFacts는 입력 문장이다' : `founderFacts ${facts.join(' / ') || '없음'}`,
    strengthsOk ? 'strengths는 미확인이거나 입력 문장이다' : `strengths ${strengths.join(' / ') || '없음'}`,
    inferencesOk ? 'inferences는 추론으로 표시됐다' : `inferences ${inferences.join(' / ') || '없음'}`,
  ].join('. ');
  return { founderFactsOk, strengthsOk, inferencesOk, detail };
}

function factIncludes(text: string, trait: string): boolean {
  return text.includes(trait);
}

export const QUALITY9_PROMPT_VERSION = 'quality-9-cpo-draft';

export const QUALITY9_EXPERIENCE_INPUT = '외국인 관광객에게 막걸리 만들기체험만 안내한다.';

export const QUALITY9_SUPPLIER_INPUT = '지역 공장에 온라인 마케팅 페이지 제작만 대행한다.';

export function buildQuality9InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY9_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality9CompareRequest(item.text),
  }));
}

/** One interpretation, or 미확인 when the input does not support a separate inference. */
export function quality9Inference(text: string): string {
  const body = text.split(/\n\s*검토 목적:/)[0] ?? text;
  const experience = /체험|만들고|마시고/.test(body);
  const support = /마케팅/.test(body);
  if (experience && support) {
    return '추론: 입력은 체험과 마케팅 지원을 함께 구상한다고 말한다. 어느 쪽을 먼저 검증할지는 입력에 없다.';
  }
  return '미확인';
}

export function quality9EvidenceBlock(text: string): string {
  const kept = quality8EvidenceBlock(text)
    .split('\n')
    .filter((line) => !line.startsWith('inferences의 각 문자열') && !line.startsWith('추론을 founderFacts'));
  return [
    ...kept,
    `inferences는 ${JSON.stringify([quality9Inference(text)])} 만 쓴다.`,
    'founderFacts의 문장을 inferences에 그대로 또는 표현만 바꾸어 다시 넣지 않는다.',
    '새 해석의 근거가 없으면 inferences는 ["미확인"] 만 쓴다.',
  ].join('\n');
}

export const QUALITY9_SYSTEM_PROMPT = [
  QUALITY8_SYSTEM_PROMPT.replace('프롬프트 버전 quality-8-cpo-draft.', '프롬프트 버전 quality-9-cpo-draft.'),
  'inferences는 입력 문장에서 도출한 해석만 담는다. 입력 문장을 그대로 또는 표현만 바꾸어 다시 적지 않는다. 근거가 없으면 미확인이다.',
].join('\n');

export const QUALITY10_PROMPT_VERSION = 'quality-10-cpo-draft';

export const QUALITY10_EXPERIENCE_CHOICES = [
  '외국인 관광객이 막걸리 만들기체험을 원하는지 먼저 검증',
  '체험을 어디서 어떻게 운영할지 먼저 검증',
  '참가비를 누가 낼지 먼저 검증',
  '아직 우선순위를 결정하지 못함',
  '기타 / 직접 입력',
] as const;

export const QUALITY10_SUPPLIER_CHOICES = [
  '지역 공장이 페이지 제작을 맡길지 먼저 검증',
  '제작 범위가 페이지 하나인지 먼저 검증',
  '마케팅 서비스 수수료를 공장이 낼지 먼저 검증',
  '아직 우선순위를 결정하지 못함',
  '기타 / 직접 입력',
] as const;

export type QualityBranchKind = 'brewery' | 'experience' | 'supplier' | 'generic';

export type QualityBranch = {
  kind: QualityBranchKind;
  question: string;
  choices: readonly string[];
  absent: string;
  summary: string;
  customer: string;
};

export function quality10Branch(text: string): QualityBranch {
  const body = text.split(/\n\s*검토 목적:/)[0] ?? text;
  const experience = /체험|만들고|마시고/.test(body);
  const support = /마케팅/.test(body);
  if (experience && support && /양조장/.test(body)) {
    return {
      kind: 'brewery',
      question: '무엇을 먼저 검증할 것인가?',
      choices: QUALITY6_BREWERY_CHOICES,
      absent: '입력에 없는 막걸리 만들기 전용 문장이나 공장 페이지 전용 문장을 쓰지 않는다.',
      summary: '관광객 대상 양조장 체험과 양조장 온라인 마케팅 지원을 함께 구상 중이다.',
      customer: '전통주 양조장을 좋아하는 내국인·외국인 관광객',
    };
  }
  if (experience && !support && /막걸리/.test(body)) {
    return {
      kind: 'experience',
      question: '막걸리 만들기체험에서 무엇을 먼저 확인할 것인가?',
      choices: QUALITY10_EXPERIENCE_CHOICES,
      absent: '공급자 마케팅 지원, 양조장, 온라인 페이지 대행은 질문과 선택지에 쓰지 않는다.',
      summary: '외국인 관광객에게 막걸리 만들기체험만 안내하는 구상이다.',
      customer: '외국인 관광객',
    };
  }
  if (support && !experience && /공장/.test(body) && /페이지/.test(body)) {
    return {
      kind: 'supplier',
      question: '온라인 마케팅 페이지 대행에서 무엇을 먼저 확인할 것인가?',
      choices: QUALITY10_SUPPLIER_CHOICES,
      absent: '관광객 체험, 양조장, 막걸리 만들기는 질문과 선택지에 쓰지 않는다.',
      summary: '지역 공장에 온라인 마케팅 페이지 제작만 대행하는 구상이다.',
      customer: '지역 공장',
    };
  }
  return {
    kind: 'generic',
    question: '무엇을 먼저 검증할 것인가?',
    choices: ['입력에 적힌 고객을 먼저 검증', '입력에 적힌 제공 방식을 먼저 검증', '누가 비용을 낼지 먼저 검증', '아직 우선순위를 결정하지 못함', '기타 / 직접 입력'],
    absent: '입력에 없는 체험 상품이나 마케팅 대행을 선택지에 넣지 않는다.',
    summary: '입력에 적힌 사업 구상이다. 확인되지 않은 항목은 미확인이다.',
    customer: '미확인',
  };
}

export function quality10UserBlock(text: string): string {
  const branch = quality10Branch(text);
  const facts = quality8FounderFacts(text);
  const inference = quality9Inference(text);
  return [
    `프롬프트 버전 ${QUALITY10_PROMPT_VERSION}.`,
    `키: ${QUALITY5_OUTPUT_KEYS}.`,
    'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다.',
    'strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다.',
    'choices는 배열만 쓴다. 문자열이나 미확인 한 단어로 쓰지 않는다.',
    `nextQuestion은 ${branch.question} 만 쓴다.`,
    `choices는 ${JSON.stringify([...branch.choices])} 만 이 순서로 쓴다.`,
    branch.absent,
    '질문과 선택지는 같은 결정이다. 선택지에 없는 방향을 묻지 않는다.',
    `founderFacts는 ${JSON.stringify(facts)} 만 쓴다.`,
    '입력에 없는 경력, 능력, 네트워크는 쓰지 않는다.',
    'strengths는 ["미확인"] 만 쓴다. 관심 증가를 쓰지 않는다.',
    `inferences는 ${JSON.stringify([inference])} 만 쓴다.`,
    'founderFacts 문장을 inferences에 그대로 또는 표현만 바꾸어 다시 넣지 않는다.',
    '입력에 지불자가 없으면 payer는 미확인이다.',
    'revenueModel의 JSON 타입은 string이다. 객체, 배열, 한 항목으로 줄이지 않는다.',
    `revenueModel 값은 다음 문자열만 쓴다. ${quality7RevenueString(text)}`,
    '가격, 매출, 고객 수, 계약, 제휴 확정은 만들지 않는다.',
    'operatingModel은 구상이다. 모르는 문자열 키는 미확인이다.',
  ].join('\n');
}

export const QUALITY10_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-10-cpo-draft.',
  'JSON 객체만 반환한다.',
  `키는 ${QUALITY5_OUTPUT_KEYS} 이다.`,
  'summary, customer, problem, value, operatingModel, alternatives, differentiation, payer, revenueModel, market, competition, operations, profitability, judgment, nextVerification, nextQuestion, nextQuestionReason은 문자열이다.',
  'strengths, risks, assumptions, evidenceToChange, founderFacts, inferences, choices는 문자열 배열이다.',
  'choices는 배열이다. 문자열로 쓰지 않는다.',
  'revenueModel의 JSON 타입은 string이다. 사용자 메시지의 수익 문자열을 줄이지 않는다.',
  'payer는 입력에 지불자가 없으면 미확인이다.',
  'founderFacts는 입력 문장만 담는다. inferences에 그 문장을 다시 적지 않는다.',
  '질문과 choices는 그 입력에 있는 사업만 가른다. 입력에 없는 다른 사업 축을 가정하지 않는다.',
  '모델이나 공급사 이름은 쓰지 않는다.',
].join('\n');

export function buildQuality10CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY10_SYSTEM_PROMPT },
      { role: 'user', content: `사업 입력:\n${text}\n\n${quality10UserBlock(text)}` },
    ],
  };
}

export const QUALITY11_PROMPT_VERSION = 'quality-11-cpo-draft';

/** Copy targets for one input. Branching picks the question. The model does not invent the other axis. */
export function quality11UserBlock(text: string): string {
  const branch = quality10Branch(text);
  return [
    `프롬프트 버전 ${QUALITY11_PROMPT_VERSION}.`,
    'JSON 객체만 반환한다. 아래 칸의 값을 그대로 넣는다.',
    'summary 값:',
    branch.summary,
    'customer 값:',
    branch.customer,
    'nextQuestion 값:',
    branch.question,
    'nextQuestionReason 값:',
    '입력만으로는 무엇을 먼저 확인할지 정해지지 않는다.',
    'choices 값:',
    JSON.stringify([...branch.choices]),
    'revenueModel 값:',
    quality7RevenueString(text),
    'founderFacts 값:',
    JSON.stringify(quality8FounderFacts(text)),
    'inferences 값:',
    JSON.stringify([quality9Inference(text)]),
    'strengths 값: ["미확인"]',
    'risks 값: ["미확인"]',
    'assumptions 값: ["미확인"]',
    'evidenceToChange 값: ["미확인"]',
    'payer 값: 미확인',
    'operatingModel 값: 구상',
    'problem 값: 미확인',
    'value 값: 미확인',
    'alternatives 값: 미확인',
    'differentiation 값: 미확인',
    'market 값: 미확인',
    'competition 값: 미확인',
    'operations 값: 미확인',
    'profitability 값: 미확인',
    'judgment 값: 미확인',
    'nextVerification 값:',
    branch.question,
    'choices는 위 JSON 배열이다. 문자열로 쓰지 않는다.',
    'nextQuestion은 위 질문 문장이다. 선택지 문장을 질문으로 쓰지 않는다.',
    'revenueModel은 위 문자열 전체다. 한 항목만 남기지 않는다.',
    branch.absent,
    '가격, 매출, 고객 수, 계약, 제휴는 만들지 않는다.',
  ].join('\n');
}

export const QUALITY11_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-11-cpo-draft.',
  'JSON 객체만 반환한다.',
  '사용자 메시지의 summary, customer, nextQuestion, choices, revenueModel, founderFacts, inferences, payer 칸을 그대로 쓴다.',
  'choices는 배열이다. revenueModel은 문자열이다.',
  '선택지 한 줄을 질문으로 쓰지 않는다. 수익 항목을 빼지 않는다.',
  '입력에 없는 다른 사업 축, 가격, 매출, 고객 수, 계약, 제휴는 만들지 않는다.',
].join('\n');

export function buildQuality11CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY11_SYSTEM_PROMPT },
      { role: 'user', content: `사업 입력:\n${text}\n\n${quality11UserBlock(text)}` },
    ],
  };
}

export const QUALITY12_PROMPT_VERSION = 'quality-12-cpo-draft';

function labeledValue(label: string, value: string): string[] {
  return [`${label} 값:`, value];
}

/** Every contract field is on its own line. quality-11 dropped fields written on the label line. */
export function quality12UserBlock(text: string): string {
  const branch = quality10Branch(text);
  return [
    `프롬프트 버전 ${QUALITY12_PROMPT_VERSION}.`,
    'JSON 객체만 반환한다. 각 칸의 다음 줄을 값으로 넣고, 칸을 빼지 않는다.',
    ...labeledValue('summary', branch.summary),
    ...labeledValue('customer', branch.customer),
    ...labeledValue('problem', '미확인'),
    ...labeledValue('value', '미확인'),
    ...labeledValue('operatingModel', '구상'),
    ...labeledValue('alternatives', '미확인'),
    ...labeledValue('differentiation', '미확인'),
    ...labeledValue('payer', '미확인'),
    ...labeledValue('revenueModel', quality7RevenueString(text)),
    ...labeledValue('market', '미확인'),
    ...labeledValue('competition', '미확인'),
    ...labeledValue('operations', '미확인'),
    ...labeledValue('profitability', '미확인'),
    ...labeledValue('strengths', '["미확인"]'),
    ...labeledValue('risks', '["미확인"]'),
    ...labeledValue('assumptions', '["미확인"]'),
    ...labeledValue('evidenceToChange', '["미확인"]'),
    ...labeledValue('founderFacts', JSON.stringify(quality8FounderFacts(text))),
    ...labeledValue('inferences', JSON.stringify([quality9Inference(text)])),
    ...labeledValue('judgment', '미확인'),
    ...labeledValue('nextVerification', branch.question),
    ...labeledValue('nextQuestion', branch.question),
    ...labeledValue('nextQuestionReason', '입력만으로는 무엇을 먼저 확인할지 정해지지 않는다.'),
    ...labeledValue('choices', JSON.stringify([...branch.choices])),
    'choices는 JSON 배열이다. revenueModel은 문자열 한 줄 전체다.',
    'nextQuestion에 선택지 문장을 넣지 않는다.',
    branch.absent,
    '가격, 매출, 고객 수, 계약, 제휴는 만들지 않는다.',
  ].join('\n');
}

export const QUALITY12_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-12-cpo-draft.',
  'JSON 객체만 반환한다.',
  '사용자 메시지의 각 칸 다음 줄을 그대로 넣는다. 칸을 빼지 않는다.',
  'choices는 배열이다. revenueModel은 문자열이다.',
  '선택지 한 줄을 질문으로 쓰지 않는다. 수익 항목을 빼지 않는다.',
  '입력에 없는 다른 사업 축, 가격, 매출, 고객 수, 계약, 제휴는 만들지 않는다.',
].join('\n');

export function buildQuality12CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY12_SYSTEM_PROMPT },
      { role: 'user', content: `사업 입력:\n${text}\n\n${quality12UserBlock(text)}` },
    ],
  };
}

/** Product prompt only. The user message is the business text, not a copy sheet. */
export const QUALITY13_PROMPT_VERSION = 'quality-13-cpo-draft';

/** One constraint for the decision already present in the input. Not a choice list. */
export function quality13DecisionCue(kind: QualityBranchKind): string {
  if (kind === 'brewery') {
    return '이 입력에는 체험과 마케팅 지원이 함께 있다. 질문은 어느 쪽을 먼저 검증할지, 또는 둘을 어떻게 같이 검증할지다. 협력 방법만 묻지 않는다.';
  }
  if (kind === 'experience') {
    return '이 입력은 막걸리 만들기체험만 있다. 질문은 그 체험의 수요, 운영, 지불 중 입력에 없는 하나다. 다른 문화 체험을 더하지 않는다.';
  }
  if (kind === 'supplier') {
    return '이 입력은 온라인 마케팅 페이지 제작 대행만 있다. 질문은 그 대행의 문제, 범위, 지불 중 입력에 없는 하나다. 관광 체험이나 추가 상품을 더하지 않는다.';
  }
  return '질문은 입력에 이미 적힌 갈림길 하나다. 입력에 없는 사업을 더하지 않는다.';
}

/** Rules for the six quality-2 failures. The user message does not contain the answer text. */
export function quality13UserBlock(text: string): string {
  const branch = quality10Branch(text);
  return [
    `프롬프트 버전 ${QUALITY13_PROMPT_VERSION}.`,
    'JSON 객체만 반환한다. 질문 문장, 선택지 목록, 수익 문장, 추론 문장은 여기에 없다. 입력만 보고 직접 쓴다.',
    'founderFacts는 입력 문장만 담은 배열이다. 경력, 네트워크, 역량은 입력에 없으면 쓰지 않는다.',
    'inferences는 배열이다. 입력에서 바로 나오는 해석만 적고 각 문장을 추론: 으로 시작한다. 근거가 없으면 ["미확인"]만 쓴다.',
    'strengths는 입력에 강점이 없으면 ["미확인"]이다. 관심 증가, 매출 증대, 고객 확보는 입력에 없으면 쓰지 않는다.',
    'payer는 입력에 누가 돈을 내는지 없으면 미확인이다. 고객을 지불자로 단정하지 않는다.',
    'revenueModel은 문자열이다. 입력에 없는 수익은 그 항목 바로 앞에 가설: 를 붙인다. 문장 끝의 (가설) 하나로는 부족하다. 판매 수익과 유지비는 입력에 없으면 만들지 않는다.',
    'alternatives, differentiation, market, competition, operations, profitability, judgment, problem, value는 입력에 없으면 미확인이다.',
    quality13DecisionCue(branch.kind),
    'choices는 그 질문에 대한 서로 다른 답이다. 선택지를 물음표로 쓰지 않는다. 아직 정하지 못함과 기타 / 직접 입력을 포함한다.',
    'summary는 입력에 있는 사업만 말한다.',
    `키: ${QUALITY5_OUTPUT_KEYS}`,
  ].join('\n');
}

export const QUALITY13_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-13-cpo-draft.',
  'JSON 객체만 반환한다.',
  '입력에 없는 경력, 네트워크, 역량, 지불자, 매출, 계약, 제휴를 사실로 쓰지 않는다.',
  '지불자가 입력에 없으면 payer는 미확인이다.',
  '수익은 항목마다 가설: 또는 사실: 이다. 문장 끝의 (가설) 하나로는 부족하다.',
  '질문은 입력에 있는 갈림길이다. 선택지는 그 질문의 답이다.',
  '모르는 칸은 미확인이다.',
].join('\n');

export function buildQuality13CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY13_SYSTEM_PROMPT },
      { role: 'user', content: `사업 입력:\n${text}\n\n${quality13UserBlock(text)}` },
    ],
  };
}

export const QUALITY14_PROMPT_VERSION = 'quality-14-cpo-draft';

/** quality-13 named only the fallback choices, so experience and supplier returned just those. */
export function quality14UserBlock(text: string): string {
  return [
    quality13UserBlock(text).replaceAll(
      `프롬프트 버전 ${QUALITY13_PROMPT_VERSION}.`,
      `프롬프트 버전 ${QUALITY14_PROMPT_VERSION}.`,
    ),
    '아직 정하지 못함과 기타 / 직접 입력은 선택지의 마지막이다. 그 앞에 질문을 가르는 답을 둘 이상 둔다.',
    '판매 수익, 유지비, 유지 관리라는 말을 쓰지 않는다. (가설)을 문장 끝에 붙이지 않는다.',
    'inferences에 입력 문장을 그대로 또는 표현만 바꾸어 넣지 않는다. 추론: 이 없으면 ["미확인"]이다.',
  ].join('\n');
}

export const QUALITY14_SYSTEM_PROMPT = [
  '프롬프트 버전 quality-14-cpo-draft.',
  ...QUALITY13_SYSTEM_PROMPT.split('\n').slice(1),
  '선택지는 미결정과 기타만으로 끝내지 않는다. 질문을 가르는 답을 그 앞에 둔다.',
].join('\n');

export function buildQuality14CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  return {
    model: AI_PM_REVIEW_MODEL,
    temperature: 0.2,
    maxTokens: AI_PM_REVIEW_FIRST_MAX_TOKENS,
    responseFormat: { type: 'json_object' },
    messages: [
      { role: 'system', content: QUALITY14_SYSTEM_PROMPT },
      { role: 'user', content: `사업 입력:\n${text}\n\n${quality14UserBlock(text)}` },
    ],
  };
}

export function buildQuality14InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY14_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality14CompareRequest(item.text),
  }));
}

export function buildQuality13InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY13_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality13CompareRequest(item.text),
  }));
}

export function buildIndependentInputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${AI_PM_FIRST_PROMPT_VERSION}:${item.inputId}`,
    request: buildFirstReviewRequest(item.text),
  }));
}

export function buildQuality12InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY12_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality12CompareRequest(item.text),
  }));
}

export function buildQuality11InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY11_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality11CompareRequest(item.text),
  }));
}

export function buildQuality10InputRequests(): Array<{ inputId: string; promptVersion: string; request: ChatRequest }> {
  return [
    { inputId: 'brewery', text: COMPARE_BUSINESS_INPUT },
    { inputId: 'experience', text: QUALITY9_EXPERIENCE_INPUT },
    { inputId: 'supplier', text: QUALITY9_SUPPLIER_INPUT },
  ].map((item) => ({
    inputId: item.inputId,
    promptVersion: `${QUALITY10_PROMPT_VERSION}:${item.inputId}`,
    request: buildQuality10CompareRequest(item.text),
  }));
}

export function buildQuality9CompareRequest(text = COMPARE_BUSINESS_INPUT): ChatRequest {
  const quality8 = buildQuality8CompareRequest(text);
  const user = (quality8.messages[1]?.content ?? '')
    .replace(`프롬프트 버전 ${QUALITY8_PROMPT_VERSION}.`, `프롬프트 버전 ${QUALITY9_PROMPT_VERSION}.`)
    .replace(quality8EvidenceBlock(text), quality9EvidenceBlock(text));
  return {
    ...quality8,
    messages: [
      { role: 'system', content: QUALITY9_SYSTEM_PROMPT },
      { role: 'user', content: user },
    ],
  };
}

function repeatsFounderFact(inference: string, fact: string): boolean {
  const text = inference.replace(/\s+/g, '');
  const source = fact.replace(/\s+/g, '');
  if (!source) return false;
  if (text.includes(source) || text.replace(/^추론:/, '') === source) return true;
  for (let index = 0; index + 24 <= source.length; index += 8) {
    if (text.includes(source.slice(index, index + 24))) return true;
  }
  return false;
}

/** True when inferences are interpretations, not a second copy of founder facts. */
export function scoreInferenceSeparation(
  raw: string | null,
  sourceText: string,
): { separated: boolean; detail: string } {
  if (!raw?.trim()) return { separated: false, detail: '원문 없음' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { separated: false, detail: 'JSON이 아니다' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { separated: false, detail: 'JSON 객체가 아니다' };
  }
  const inferences = (parsed as Record<string, unknown>).inferences;
  const items = Array.isArray(inferences) ? inferences.filter((item): item is string => typeof item === 'string') : [];
  if (items.length === 1 && items[0] === '미확인') return { separated: true, detail: '미확인' };
  const facts = quality8FounderFacts(sourceText);
  const copied = items.filter((item) => facts.some((fact) => repeatsFounderFact(item, fact)));
  const unmarked = items.filter((item) => !item.startsWith('추론:'));
  if (items.length === 0 || copied.length > 0 || unmarked.length > 0) {
    return { separated: false, detail: copied[0] ?? unmarked[0] ?? '추론 없음' };
  }
  return { separated: true, detail: items.join(' / ') };
}

export type BranchContractScore = {
  parserOk: boolean;
  questionOk: boolean;
  choicesOk: boolean;
  axisOk: boolean;
  summaryOk: boolean;
  payerOk: boolean;
  revenueOk: boolean;
  factsOk: boolean;
  inferencesOk: boolean;
  detail: string;
};

function forbiddenAxis(kind: QualityBranchKind): RegExp | null {
  if (kind === 'experience') return /공급자|마케팅 지원|양조장|페이지 대행|온라인 마케팅/;
  if (kind === 'supplier') return /관광객|막걸리|양조장|체험/;
  if (kind === 'brewery') return /막걸리 만들기|공장 페이지/;
  return null;
}

function summaryMatchesBranch(kind: QualityBranchKind, summary: string): boolean {
  if (kind === 'brewery') return /체험/.test(summary) && /마케팅/.test(summary);
  if (kind === 'experience') return /체험|막걸리/.test(summary) && !/공급자|마케팅/.test(summary);
  if (kind === 'supplier') return /페이지|마케팅/.test(summary) && !/체험|관광객|막걸리|양조장/.test(summary);
  return summary.trim().length > 0;
}

/** Product contract for one input. This scores a stored string and does not call a model. */
export function scoreBranchContract(raw: string | null, sourceText: string): BranchContractScore {
  const fail = (detail: string): BranchContractScore => ({
    parserOk: false,
    questionOk: false,
    choicesOk: false,
    axisOk: false,
    summaryOk: false,
    payerOk: false,
    revenueOk: false,
    factsOk: false,
    inferencesOk: false,
    detail,
  });
  if (!raw?.trim()) return fail('원문 없음');
  const contract = reviewContractError(raw);
  const sections = parseSections(raw, sourceText);
  const parserOk = contract === null && Boolean(sections?.analysis);
  const branch = quality10Branch(sourceText);
  const question = sections?.nextQuestion ?? '';
  const labels = sections?.analysis?.choices.map((choice) => choice.label) ?? [];
  const summary = sections?.analysis?.summary ?? '';
  const questionOk = question === branch.question && !branch.choices.includes(question);
  const choicesOk =
    labels.length === branch.choices.length && labels.every((label, index) => label === branch.choices[index]);
  const forbidden = forbiddenAxis(branch.kind);
  const surface = `${summary}\n${question}\n${labels.join('\n')}`;
  const axisOk = forbidden ? !forbidden.test(surface) : true;
  const summaryOk = summaryMatchesBranch(branch.kind, summary);
  const payer = sections?.analysis?.payer ?? '';
  const payerOk = payer === '미확인' || payer.startsWith('미확인');
  const revenue = scoreRevenueContract(raw, sourceText);
  const revenueOk = revenue.typeOk && revenue.itemsOk;
  const facts = sections?.analysis?.founderFacts ?? [];
  const source = sourceText.replace(/\s+/g, '');
  const factsOk = facts.length > 0 && facts.every((fact) => source.includes(fact.replace(/\s+/g, '')));
  const inferencesOk = scoreInferenceSeparation(raw, sourceText).separated;
  const detail = [
    parserOk ? '파서 수용' : `파서 ${contract ?? '거절'}`,
    questionOk ? '질문 일치' : `질문 ${question || '없음'}`,
    choicesOk ? '선택지 일치' : `선택지 ${labels.join(' | ') || '없음'}`,
    axisOk ? '없는 축 없음' : '입력에 없는 사업 축',
    summaryOk ? '요약은 입력 축' : `요약 ${summary || '없음'}`,
    payerOk ? '지불자 미확인' : `payer ${payer || '없음'}`,
    revenueOk ? '수익 항목 가설' : revenue.detail,
    factsOk ? '사실은 입력 문장' : 'founderFacts',
    inferencesOk ? '추론 분리' : '추론 복사 또는 표시 없음',
  ].join('; ');
  return { parserOk, questionOk, choicesOk, axisOk, summaryOk, payerOk, revenueOk, factsOk, inferencesOk, detail };
}

export function branchContractPass(score: BranchContractScore): boolean {
  return (
    score.parserOk &&
    score.questionOk &&
    score.choicesOk &&
    score.axisOk &&
    score.summaryOk &&
    score.payerOk &&
    score.revenueOk &&
    score.factsOk &&
    score.inferencesOk
  );
}

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
