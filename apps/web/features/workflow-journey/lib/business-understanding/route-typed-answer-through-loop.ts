/**
 * Login-UI typed answers that are customer corrections must hit the
 * existing engine write path (`applyBusinessChoiceThroughLoop`).
 * Does not change CONTRADICTED / Memory parking rules.
 */
import {
  isCorrectionUtterance,
  isCustomerFieldCorrection,
  parseNotXButYCorrection,
} from './ai-pm-correction-semantics';
import { applyBusinessChoiceThroughLoop } from './apply-business-choice-through-loop';

export function isOffSlotCustomerCorrection(answer: string, askedGap: string | null | undefined): boolean {
  const trimmed = answer.trim();
  const asked = askedGap?.trim() || '';
  if (!asked || asked === 'customerPersona') return false;
  if (!isCorrectionUtterance(trimmed)) return false;
  return Boolean(parseNotXButYCorrection(trimmed) || isCustomerFieldCorrection(trimmed));
}

/**
 * Route only:
 * - off-slot customer correction (T6 on payer / validation / …)
 * - any answer while customerPersona is already CONTRADICTED (T7 reconfirm)
 *
 * Leave on-slot 아니라 (customer CLOSED) to the existing composer dialog.
 * Leave payer role labels and unknown on the normal panel path.
 */
export function shouldRouteTypedAnswerThroughLoop(input: {
  answer: string;
  askedGap: string | null | undefined;
  customerCompleteness?: string | null;
}): boolean {
  const answer = input.answer.trim();
  if (answer.length < 4) return false;
  if (isOffSlotCustomerCorrection(answer, input.askedGap)) return true;
  if (input.customerCompleteness !== 'CONTRADICTED') return false;
  const asked = input.askedGap?.trim() || '';
  if (asked === 'customerPersona') return true;
  return isCustomerFieldCorrection(answer) || /(?:고객|타깃|타겟|메인)/.test(answer);
}

/**
 * Off-slot customer correction must not write the asked slot (payer/problem).
 * Engine T6 already uses validationTestability as the asked gap so CONTRADICTED
 * fires without closing payer.
 */
export function resolveThroughLoopGap(input: {
  answer: string;
  askedGap: string;
  customerCompleteness?: string | null;
}): string {
  if (isOffSlotCustomerCorrection(input.answer, input.askedGap)) {
    return 'validationTestability';
  }
  if (input.customerCompleteness === 'CONTRADICTED') {
    return 'customerPersona';
  }
  return input.askedGap;
}

export function applyTypedAnswerThroughLoop(input: {
  projectId?: string;
  documentText: string;
  answer: string;
  askedGap: string;
  askedQuestionText?: string | null;
  customerCompleteness?: string | null;
}) {
  return applyBusinessChoiceThroughLoop({
    projectId: input.projectId,
    documentText: input.documentText,
    option: {
      id: 'typed-through-loop',
      label: '기타',
      answerText: input.answer,
      kind: 'specific',
      appliesToGap: resolveThroughLoopGap({
        answer: input.answer,
        askedGap: input.askedGap,
        customerCompleteness: input.customerCompleteness,
      }),
      evidenceClassHint: 'FACT',
    },
    askedQuestionText: input.askedQuestionText,
  });
}
