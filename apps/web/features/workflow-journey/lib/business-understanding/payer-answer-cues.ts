/**
 * CEO walkthrough — payer answers often imply "customer pays" without 결제/지불 keywords.
 */

import { hasCustomerPersonaCue, hasPersonaSegmentCue } from './persona-answer-cues';

/** Implicit B2C payer — customer/subject pays without explicit payment verb. */
export const IMPLICIT_PAYER_CUE_RE =
  /(고객|소비자|사용자|관광객|여행객|여행자|b2c|직접|당연히|구매자|이용자)/i;

/** Role labels from payer MCQ — 「집이 낸다」 / 「부모가 낸다」 / 「사장님」. */
export const PAYER_ROLE_ANSWER_RE =
  /(집|부모|사장(?:님)?|본사|대표|양쪽|도우미|본인|회사|가맹|관리자|쓰는\s*사람|선물하는\s*사람|여행객|양조장|회원).{0,12}(낸다|냄|지불|결제|결재)/i;

export function hasImplicitPayerCue(text: string): boolean {
  return IMPLICIT_PAYER_CUE_RE.test(text.trim());
}

export function isRolePayerAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 2) return false;
  if (PAYER_ROLE_ANSWER_RE.test(trimmed)) return true;
  return /^(사장님|본사|집이\s*낸다|부모가\s*낸다|양쪽이\s*낸다|도우미가\s*낸다)$/i.test(
    trimmed,
  );
}

/** On payer ask — WHO pays, even when answer names customer not payment mechanics. */
export function isOnSlotPayerAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 2) return false;
  if (/^(결제|지불|payer|수익|구독|수수료)/i.test(trimmed)) return true;
  if (isRolePayerAnswer(trimmed)) return true;
  if (hasImplicitPayerCue(trimmed)) return true;
  if (hasCustomerPersonaCue(trimmed) || hasPersonaSegmentCue(trimmed)) return true;
  return false;
}
