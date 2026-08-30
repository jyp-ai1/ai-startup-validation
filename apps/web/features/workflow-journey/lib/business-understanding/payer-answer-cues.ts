/**
 * CEO walkthrough — payer answers often imply "customer pays" without 결제/지불 keywords.
 */

import { hasCustomerPersonaCue, hasPersonaSegmentCue } from './persona-answer-cues';

/** Implicit B2C payer — customer/subject pays without explicit payment verb. */
export const IMPLICIT_PAYER_CUE_RE =
  /(고객|소비자|사용자|관광객|여행객|여행자|b2c|직접|당연히|구매자|이용자)/i;

export function hasImplicitPayerCue(text: string): boolean {
  return IMPLICIT_PAYER_CUE_RE.test(text.trim());
}

/** On payer ask — WHO pays, even when answer names customer not payment mechanics. */
export function isOnSlotPayerAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 2) return false;
  if (/^(결제|지불|payer|수익|구독|수수료)/i.test(trimmed)) return true;
  if (hasImplicitPayerCue(trimmed)) return true;
  if (hasCustomerPersonaCue(trimmed) || hasPersonaSegmentCue(trimmed)) return true;
  return false;
}
