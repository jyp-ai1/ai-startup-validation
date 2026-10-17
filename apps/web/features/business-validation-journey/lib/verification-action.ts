import type { FounderAnswer, HypothesisJudgment, Intake, JourneyState, PlanCase } from './journey-types';

export type VerificationAction = {
  id: string;
  evidenceNeeded: string;
  action: string;
  affectedHypothesisIds: string[];
};

export function verificationActionFor(
  state: Pick<JourneyState, 'intake' | 'answers' | 'revisions'> & {
    hypothesisJudgments?: HypothesisJudgment[];
    planCase?: PlanCase;
  },
): VerificationAction {
  const held = (state.hypothesisJudgments ?? []).find((item) => item.stance === 'held');
  if (held) {
    return {
      id: `verify-conflict-${held.hypothesisId}`,
      evidenceNeeded: state.planCase
        ? '충돌을 가릴 원장 또는 결제 원문. 창업자 요약과 테스트 픽스처는 제외한다.'
        : '충돌을 가릴 업무 절차 관찰 원문. 창업자 요약은 제외한다.',
      action: state.planCase
        ? '문제 가설을 지지하는 문장과 반박 문장을 둘 다 남긴다. 어느 쪽도 검증된 사실이 아니다. 원장이나 결제 원문으로만 가른다.'
        : '문제 가설을 지지하는 원문과 반박하는 원문이 충돌한다. 발주 담당자의 실제 업무 절차를 한 건 더 보고, 어느 쪽 문장과 맞는지 원문 한 줄을 가져온다.',
      affectedHypothesisIds: [held.hypothesisId],
    };
  }
  const customerChange = [...state.revisions].reverse().find((revision) => revision.material && revision.field === 'customer');
  const payment = hasPaymentClaim(state.intake, state.answers);
  const interview = hasInterviewClaim(state.intake, state.answers);
  const customer = customerChange?.next ?? state.intake.customer;

  if (customerChange) {
    return {
      id: `verify-customer-${customerChange.id}`,
      evidenceNeeded: state.planCase
        ? `「${customer}」의 문제 원문. 이전 고객의 문장을 근거로 쓰지 않는다.`
        : `「${customer}」의 업무 절차 관찰 원문. 창업자가 다시 적은 문장은 근거가 아니다.`,
      action: state.planCase
        ? `「${customer}」에게 이전 문제가 같은지 그 고객의 원문으로 확인한다. 이전 고객의 문제를 새 고객의 문제로 옮기지 않는다.`
        : `「${customer}」의 실제 발주나 배송 절차를 한 건 보고, 주문과 배송이 어디서 나뉘는지 적힌 원문 한 줄을 가져온다.`,
      affectedHypothesisIds: coreHypothesisIds(state.intake),
    };
  }

  const planAction = planVerification(state.planCase, state.answers);
  if (planAction) return planAction;

  if (payment) {
    return {
      id: 'verify-payment',
      evidenceNeeded: '날짜, 금액, 낸 사람이 적힌 결제 원문.',
      action: `「${customer}」가 실제로 낸 결제 기록 한 건을 가져온다. 금액과 날짜가 원문에 있어야 한다.`,
      affectedHypothesisIds: ['h-payer', 'h-revenue'],
    };
  }

  if (interview) {
    return {
      id: 'verify-interview',
      evidenceNeeded: '고객이 직접 말한 문장. 창업자의 요약은 제외한다.',
      action: `「${customer}」가 문제를 직접 말한 문장 한 줄을 가져온다.`,
      affectedHypothesisIds: ['h-customer', 'h-problem'],
    };
  }

  return {
    id: 'verify-observation-or-payment',
    evidenceNeeded: '고객 업무 절차 관찰 원문, 또는 결제 기록 한 건.',
    action: `「${customer}」의 업무 절차를 한 건 관찰하거나, 그 고객의 결제 기록 한 건을 가져온다. 같은 질문을 반복하지 않는다.`,
    affectedHypothesisIds: coreHypothesisIds(state.intake),
  };
}

function planVerification(planCase: PlanCase | undefined, answers: FounderAnswer[]): VerificationAction | null {
  if (!planCase || planCase.profile === 'unrecognized') return null;
  if (planCase.profile === 'lmulm') {
    const mix = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-lmulm-mix');
    const track = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-lmulm-repurchase-track');
    const independence = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-lmulm-independence');
    const outside = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-lmulm-outside');
    const lines = [
      mix?.choiceId === 'parent' || mix?.choiceId === 'b2b'
        ? '주문 원장에서 모회사·납품 매출과 일반 소비자 매출을 나눈다. 2,000만 회원은 모회사 회원수다.'
        : '주문 원장에서 매출 2,000만 원의 채널 비중을 나눈다. 비중을 추정으로 채우지 않는다.',
      !track || track.choiceId === 'none' || track.choiceId === 'unknown' || track.choiceId === 'unchecked'
        ? '재구매율을 추정하지 않는다. 같은 고객의 재주문을 셀 기간과 기준을 정한다.'
        : '재구매를 추적할 수 있다는 진술을 주문 코호트와 대조한다.',
      independence?.choiceId === 'dependent' || independence?.choiceId === 'required' || outside
        ? '모회사 채널 밖 고객 확보 기록을 찾는다. 없으면 독립 채널 실험 하나를 설계한다.'
        : '상품별 배송, 결제, 반품, 운영비를 뺀 공헌이익을 계산한다.',
    ];
    return {
      id: 'verify-lmulm-cohort',
      evidenceNeeded: '주문 원장과 상품별 배송·결제·반품·운영비. 창업자 진술과 테스트 픽스처는 제외한다.',
      action: lines.join(' '),
      affectedHypothesisIds: ['h-past-transaction', 'h-resale', 'h-contribution'],
    };
  }
  const payers = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-ridm-payers');
  const cost = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-ridm-cost');
  const lines = [
    !payers || payers.choiceId === 'none' || payers.choiceId === 'unknown'
      ? '최초 유료 고객 1명의 결제 원문을 가져온다. 전환율 가정은 실적으로 세지 않는다.'
      : '유료 고객이 있다는 진술을 결제 원문과 대조한다.',
    !cost || cost.choiceId === 'unknown'
      ? '그 고객의 사용량, 호출한 모델, 인프라 비용을 측정한다.'
      : '말한 고객당 비용을 사용량 기록과 대조한다.',
  ];
  return {
    id: 'verify-ridm-first-payer',
    evidenceNeeded: '결제 원문, 유지 여부, 고객당 추론·인프라 비용. 호감 표현과 테스트 픽스처는 제외한다.',
    action: lines.join(' '),
    affectedHypothesisIds: ['h-payer', 'h-demand', 'h-cost'],
  };
}

function hasPaymentClaim(intake: Intake, answers: FounderAnswer[]): boolean {
  if (intake.evidence === 'payment') return true;
  return answers.some((answer) => answer.material && answer.choiceId === 'payment');
}

function hasInterviewClaim(intake: Intake, answers: FounderAnswer[]): boolean {
  if (intake.evidence === 'interview') return true;
  return answers.some((answer) => answer.material && answer.choiceId === 'interview');
}

function coreHypothesisIds(intake: Intake): string[] {
  const ids = ['h-customer', 'h-problem'];
  if (intake.solution.trim()) ids.push('h-solution');
  if (intake.payer) ids.push('h-payer');
  if (intake.revenue) ids.push('h-revenue');
  return ids;
}
