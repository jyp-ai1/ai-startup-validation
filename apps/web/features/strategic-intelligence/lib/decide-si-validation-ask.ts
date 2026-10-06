import type {
  SiStrategicJudgment,
  SiValidationAsk,
  SiValidationKind,
} from '@repo/types/domain/strategic-intelligence';

/**
 * S.I. decides what must be known to move the judgment.
 * Kind is read from the current triad — not from a business name.
 */
export function detectSiValidationKind(judgment: SiStrategicJudgment): SiValidationKind {
  const blob = [
    judgment.criticalUnknown,
    judgment.decisionChangingEvidence,
    judgment.validationPriority,
  ].join(' ');

  if (/(C2C|재판매|재구매|두 번째 행동|2차 거래)/.test(blob)) return 'repeat_loop';
  if (/(직무|Job-to-be-done)/i.test(blob)) return 'payer_job';
  if (/(사용자와 결제자|결제자를 분리)/.test(blob)) return 'payer_split';
  if (/세그먼트/.test(blob)) return 'segment_proof';
  if (/(유료 제안|유료 전환|최초 유료)/.test(blob)) return 'paid_conversion';
  if (/고객과 문제/.test(blob)) return 'customer_problem';
  if (/반복 가능/.test(blob)) return 'repeat_loop';
  return 'generic';
}

export function decideSiValidationAsk(judgment: SiStrategicJudgment): SiValidationAsk {
  return {
    kind: detectSiValidationKind(judgment),
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
    source: 'si-v1',
  };
}
