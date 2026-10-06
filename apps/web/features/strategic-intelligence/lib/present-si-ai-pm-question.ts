import type { SiAiPmQuestion, SiValidationAsk, SiValidationKind } from '@repo/types/domain/strategic-intelligence';

const QUESTION_BY_KIND: Record<SiValidationKind, string> = {
  repeat_loop:
    '최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.',
  payer_job:
    '이 제품을 쓰며 돈을 내는 사람은 누구이고, 그 사람이 어떤 일을 이 제품으로 대신합니까? 실제 지불이 있으면 그 사람과 이유를 한 쌍으로 알려주세요. 아직이면 가설이라고 답해도 됩니다.',
  payer_split:
    '쓰는 사람과 돈을 내는 사람이 같습니까? 결제자 한 명이 이 문제를 비용으로 해결할 이유가 있다면 그 이유를 알려주세요. 아직 확인 전이면 모른다고 답해도 됩니다.',
  segment_proof:
    '지목한 고객 그룹에서 실제로 쓰거나 돈을 낸 사례가 있습니까? 있다면 한 건만 구체적으로 알려주세요. 아직이면 가정이라고 답해도 됩니다.',
  paid_conversion:
    '가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까? 있다면 그 한 건을 알려주세요. 아직이면 제안 전이라고 답해도 됩니다.',
  customer_problem:
    '이 사업의 고객은 누구이고, 그 사람이 겪는 문제는 무엇입니까? 확인된 사실만 한 문장으로 알려주세요.',
  generic:
    '지금 판단을 바꾸려면 실제 행동 증거가 필요합니다. 숫자나 사례가 있으면 알려주세요. 아직이면 계획만 있다고 답해도 됩니다.',
};

function firstSentence(text: string): string {
  const clipped = text.replace(/\s+/g, ' ').trim();
  const stop = clipped.search(/[.。]/);
  return (stop === -1 ? clipped : clipped.slice(0, stop)).trim();
}

/**
 * AI PM executes one S.I. ask. The question is not a copy of Critical Unknown.
 */
export function presentSiAiPmQuestion(ask: SiValidationAsk): SiAiPmQuestion {
  const questionText = QUESTION_BY_KIND[ask.kind];
  return {
    questionText,
    whyAsking: `이 답이 들어오면 S.I.가 판단을 다시 계산합니다. ${firstSentence(ask.decisionChangingEvidence)}.`,
    evidenceSought: ask.decisionChangingEvidence,
    kind: ask.kind,
    source: 'si-v1-ai-pm-bind',
  };
}
