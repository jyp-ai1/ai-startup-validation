import type { AnswerBehaviorId, BusinessScenarioContract } from './contracts';

/**
 * Deterministic User Agent — Business Truth + Behavior + turn index.
 * No random LLM generation (User Agent Quality Control).
 */
export function generateUserAnswer(input: {
  business: BusinessScenarioContract;
  behavior: AnswerBehaviorId;
  turn: number;
  askedGapId: string;
}): string {
  const c = input.business.groundTruth.customer?.value ?? '고객';
  const p = input.business.groundTruth.problem?.value ?? '문제';
  const payer = input.business.groundTruth.payer?.value ?? '구매 decision maker';

  switch (input.behavior) {
    case 'normal':
      return `핵심 고객은 ${c}이고, 가장 큰 문제는 ${p}입니다.`;
    case 'multi_fact':
      return `${payer}가 구매하고 팀이 매일 사용하며, 지금은 엑셀로 ${p}를 관리합니다.`;
    case 'contradiction':
      if (input.turn >= 4) {
        return '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.';
      }
      return `고객은 20~30대 ${c}입니다.`;
    case 'sparse':
      return 'B2B.';
    case 'off_slot':
      return `참고로 우리 팀은 5명이고, ${p} 문제는 심각합니다.`;
    case 'uncertainty':
      return '유료 의향은 아직 불확실하고, 인터뷰만 몇 번 했습니다.';
    case 'correction':
      if (input.turn >= 3) {
        return `정정합니다. 고객은 ${c}가 아니라 중소 제조 CEO입니다.`;
      }
      return `고객은 ${c}입니다.`;
    default:
      return `(${input.behavior}) ${c} 관련 답변 turn ${input.turn}`;
  }
}
