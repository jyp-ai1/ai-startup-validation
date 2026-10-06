import type { SiValidationKind } from '@repo/types/domain/strategic-intelligence';

/**
 * Kind-keyed founder answers for the Integration Gate.
 * Not business names — the same kind gets the same answer.
 */
export const SI_INTEGRATION_ANSWERS: Record<
  SiValidationKind,
  { validated: string; intent: string }
> = {
  repeat_loop: {
    validated: '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.',
    intent: '재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.',
  },
  payer_job: {
    validated: '결제자 1명이 실제로 월 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
    intent: '유료 결제를 생각하고 있지만 아직 아무도 돈을 내지 않았다.',
  },
  payer_split: {
    validated: '결제자 3명이 실제로 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
    intent: '결제자가 낼 의향은 있지만 아직 아무도 결제하지 않았다.',
  },
  segment_proof: {
    validated: '지목한 고객 4명이 실제로 예약하고 지불했다.',
    intent: '그 고객이 원할 것이라고 생각하고 있지만 아직 아무도 쓰지 않았다.',
  },
  paid_conversion: {
    validated: '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
    intent: '유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.',
  },
  customer_problem: {
    validated: '고객 2명이 같은 문제를 지불해서 해결했다.',
    intent: '고객과 문제를 생각하고 있지만 아직 확인된 사람이 없다.',
  },
  generic: {
    validated: '최근 고객 3명이 실제로 결제했고 유료 전환 1건이 발생했다.',
    intent: '검증을 생각하고 있지만 아직 아무도 실행하지 않았다.',
  },
};

export function pickSiIntegrationAnswer(
  kind: SiValidationKind,
  mode: 'validated' | 'intent',
): string {
  return SI_INTEGRATION_ANSWERS[kind][mode];
}
