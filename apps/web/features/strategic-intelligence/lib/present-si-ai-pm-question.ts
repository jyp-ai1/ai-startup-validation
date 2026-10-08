import type { SiAiPmQuestion, SiValidationAsk, SiValidationKind } from '@repo/types/domain/strategic-intelligence';

export type SiQuestionBindingContext = {
  /** Original business document. Never the founder answer. Never a brand name. */
  documentText?: string | null;
};

type RepeatAxis = 'resale' | 'subscription' | 'b2b_tourism' | 'b2b_contract' | 'generic';

const REPEAT_RESALE_QUESTION =
  '최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.';
const REPEAT_SUBSCRIPTION_QUESTION =
  '이미 유료로 결제한 고객 중에서, 다음 주기에도 구독을 유지하거나 다시 결제한 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 1회 결제만 있다고 답해도 됩니다.';
const REPEAT_B2B_TOURISM_QUESTION =
  '이미 유료로 전환한 고객 외에, 두 번째 계약이나 반복되는 관광 수요가 있습니까? 있다면 그 한 건을 알려주세요. 아직 없다면 1회 전환만 있다고 답해도 됩니다.';
const REPEAT_B2B_CONTRACT_QUESTION =
  '이미 유료로 전환한 고객 외에, 두 번째 고객이나 계약이 있습니까? 있다면 그 한 건을 알려주세요. 아직 없다면 1회 전환만 있다고 답해도 됩니다.';
const REPEAT_GENERIC_QUESTION =
  '이미 구매하거나 결제한 고객 중에서, 두 번째 행동이나 반복 사용이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 1회만 있다고 답해도 됩니다.';

const QUESTION_BY_KIND: Record<SiValidationKind, string> = {
  repeat_loop: REPEAT_GENERIC_QUESTION,
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

function stakeFromAsk(text: string): string | null {
  const match = text.match(/(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하)/i);
  return match?.[1] ?? null;
}

function alternativeFromAsk(text: string): string | null {
  const known = text.match(/\b(?:EMR|CRM|ERP|PDP|API)\b/);
  if (known) return known[0];
  const titled = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z]+)+/);
  return titled?.[0] ?? null;
}

function triadText(ask: SiValidationAsk): string {
  return [ask.criticalUnknown, ask.decisionChangingEvidence, ask.validationPriority].join(' ');
}

function axisFromExplicitText(text: string): RepeatAxis | null {
  if (/(C2C|재판매)/.test(text)) return 'resale';
  // Tourism / supplier-demand loop before 구독: some plans mention SaaS infra
  // without a subscription repeat axis.
  if (/(양조장|관광객|전통주|FIT)/.test(text)) return 'b2b_tourism';
  if (/구독/.test(text)) return 'subscription';
  if (/B2B/.test(text)) return 'b2b_contract';
  return null;
}

function businessSourceText(documentText?: string | null): string {
  if (!documentText) return '';
  const cut = documentText.search(/\[Founder evidence\]/i);
  return (cut === -1 ? documentText : documentText.slice(0, cut)).trim();
}

function detectRepeatAxis(ask: SiValidationAsk, documentText?: string | null): RepeatAxis {
  const fromTriad = axisFromExplicitText(triadText(ask));
  if (fromTriad) return fromTriad;
  const fromDocument = axisFromExplicitText(businessSourceText(documentText));
  return fromDocument ?? 'generic';
}

function questionForRepeatAxis(axis: RepeatAxis): string {
  if (axis === 'resale') return REPEAT_RESALE_QUESTION;
  if (axis === 'subscription') return REPEAT_SUBSCRIPTION_QUESTION;
  if (axis === 'b2b_tourism') return REPEAT_B2B_TOURISM_QUESTION;
  if (axis === 'b2b_contract') return REPEAT_B2B_CONTRACT_QUESTION;
  return REPEAT_GENERIC_QUESTION;
}

function whyAskingForRepeatAxis(ask: SiValidationAsk, axis: RepeatAxis): string {
  const prefix = '이 답이 들어오면 S.I.가 판단을 다시 계산합니다.';
  if (axis === 'resale') {
    return `${prefix} ${firstSentence(ask.decisionChangingEvidence)}.`;
  }
  if (axis === 'subscription') {
    return `${prefix} 이미 결제한 고객의 구독 유지·재결제가 반복되는지 확인합니다.`;
  }
  if (axis === 'b2b_tourism') {
    return `${prefix} 유료 전환 이후 두 번째 계약이나 관광 수요가 반복되는지 확인합니다.`;
  }
  if (axis === 'b2b_contract') {
    return `${prefix} 유료 전환 이후 두 번째 고객·계약이 있는지 확인합니다.`;
  }
  return `${prefix} 이미 구매한 고객의 두 번째 행동·반복성을 확인합니다.`;
}

function composeQuestion(ask: SiValidationAsk, documentText?: string | null): string {
  const blob = triadText(ask);
  // Stake may only come from the CU. DCE boilerplate like "이탈 없는 두 번째 거래"
  // is not a new verification axis.
  const stake = stakeFromAsk(ask.criticalUnknown);
  const versus = alternativeFromAsk(blob);
  const namesResale = /(C2C|재판매)/.test(blob);

  if (stake && !namesResale && (ask.kind === 'paid_conversion' || ask.kind === 'repeat_loop')) {
    const versusClause = versus ? ` ${versus} 대비` : '';
    return `${stake} 수치를 실제로 얼마나 줄였고,${versusClause} 그 결과로 결제 후보가 돈을 낸 사례가 있습니까? 있다면 전후 수치와 그 한 건을 알려주세요. 아직이면 제안 전이라고 답해도 됩니다.`;
  }

  if (ask.kind === 'repeat_loop') {
    return questionForRepeatAxis(detectRepeatAxis(ask, documentText));
  }

  return QUESTION_BY_KIND[ask.kind];
}

/**
 * AI PM executes one S.I. ask. The question is not a copy of Critical Unknown.
 * Weave a quantified stake only when that stake is the CU's verification object.
 * repeat_loop binds to the CU/DCE axis, then to document-derived meaning, then generic.
 */
export function presentSiAiPmQuestion(
  ask: SiValidationAsk,
  binding?: SiQuestionBindingContext,
): SiAiPmQuestion {
  const documentText = binding?.documentText ?? null;
  const questionText = composeQuestion(ask, documentText);
  const whyAsking =
    ask.kind === 'repeat_loop'
      ? whyAskingForRepeatAxis(ask, detectRepeatAxis(ask, documentText))
      : `이 답이 들어오면 S.I.가 판단을 다시 계산합니다. ${firstSentence(ask.decisionChangingEvidence)}.`;
  return {
    questionText,
    whyAsking,
    evidenceSought: ask.decisionChangingEvidence,
    kind: ask.kind,
    source: 'si-v1-ai-pm-bind',
  };
}
