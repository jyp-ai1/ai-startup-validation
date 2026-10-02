/** L4 — gap → question intent family (wording-agnostic). */

export type QuestionIntentFamily =
  | 'customer_definition'
  | 'problem_jtbd'
  | 'payer_user'
  | 'solution_scope'
  | 'alternatives_competition'
  | 'differentiation'
  | 'wtp_validation'
  | 'market_sizing'
  | 'validation_evidence'
  | 'business_summary'
  | 'unknown';

const GAP_TO_INTENT: Record<string, QuestionIntentFamily> = {
  customerPersona: 'customer_definition',
  problemJtbd: 'problem_jtbd',
  payer: 'payer_user',
  payerUser: 'payer_user',
  solution: 'solution_scope',
  alternativesCompetitors: 'alternatives_competition',
  differentiationVsAlternatives: 'differentiation',
  wtp: 'wtp_validation',
  willingnessToPay: 'wtp_validation',
  marketSize: 'market_sizing',
  validationTestability: 'validation_evidence',
  businessOneLiner: 'business_summary',
};

export function questionIntentForGap(gapId: string | null | undefined): QuestionIntentFamily {
  if (!gapId) return 'unknown';
  return GAP_TO_INTENT[gapId] ?? 'unknown';
}

export function questionTextHintsIntent(
  questionText: string | null | undefined,
  intent: QuestionIntentFamily,
): boolean {
  if (!questionText?.trim()) return false;
  const q = questionText;
  switch (intent) {
    case 'customer_definition':
      return /고객|타겟|페르소나|사용자/.test(q);
    case 'problem_jtbd':
      return /문제|JTBD|일|pain|과제/.test(q);
    case 'payer_user':
      return /구매|결제|예산|담당|payer|buyer/.test(q);
    case 'wtp_validation':
      return /유료|결제|돈|WTP|파일럿|구독/.test(q);
    case 'validation_evidence':
      return /검증|인터뷰|실험|증거/.test(q);
    case 'business_summary':
      return /한.?줄|사업|무엇/.test(q);
    default:
      return true;
  }
}
