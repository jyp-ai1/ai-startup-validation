import type { FounderAnswer, Intake, JourneyState } from './journey-types';

export type VerificationAction = {
  id: string;
  evidenceNeeded: string;
  action: string;
  affectedHypothesisIds: string[];
};

export function verificationActionFor(
  state: Pick<JourneyState, 'intake' | 'answers' | 'revisions'>,
): VerificationAction {
  const customerChange = [...state.revisions].reverse().find((revision) => revision.material && revision.field === 'customer');
  const payment = hasPaymentClaim(state.intake, state.answers);
  const interview = hasInterviewClaim(state.intake, state.answers);
  const customer = customerChange?.next ?? state.intake.customer;

  if (customerChange) {
    return {
      id: `verify-customer-${customerChange.id}`,
      evidenceNeeded: `「${customer}」의 업무 절차 관찰 원문. 창업자가 다시 적은 문장은 근거가 아니다.`,
      action: `「${customer}」의 실제 발주나 배송 절차를 한 건 보고, 주문과 배송이 어디서 나뉘는지 적힌 원문 한 줄을 가져온다.`,
      affectedHypothesisIds: coreHypothesisIds(state.intake),
    };
  }

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
