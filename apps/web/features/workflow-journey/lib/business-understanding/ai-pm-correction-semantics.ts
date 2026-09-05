/**
 * DAY 8-B P0 — CORRECT intent semantic handling.
 * Parses CEO corrections as claim revision (replace), not append.
 */

import type { ConversationFactKey } from './conversation-memory';

const CORRECTION_CUE_RE =
  /(아니\s*그게\s*아니라|사실은|정정|고쳐|수정하|아니(?:요|라)|다시\s*말하|correction|actually\s+it)/i;

const CUSTOMER_FIELD_CUE_RE =
  /(핵심\s*고객|고객(?:은|이)?|customer|타깃|타겟|타겯|persona)/i;

const NOT_X_BUT_Y_RE =
  /([\w가-힣]+(?:가게|집|점|사|팀|업|인)?)(?:이|가)\s*아니(?:요|라)\s*([\w가-힣]+(?:가게|집|점|사|팀|업|인)?)/i;

const CORRECTION_RAW_RE =
  /^(?:아니(?:요|라)[,.]?\s*)?(?:제가\s*말한\s*)?(?:핵심\s*)?고객(?:은|이)?\s*/i;

export function isCorrectionUtterance(text: string): boolean {
  return CORRECTION_CUE_RE.test(text.trim());
}

/** CEO is correcting the customer/persona claim (not problem/payer/etc.). */
export function isCustomerFieldCorrection(text: string): boolean {
  const trimmed = text.trim();
  return isCorrectionUtterance(trimmed) && CUSTOMER_FIELD_CUE_RE.test(trimmed);
}

export type ParsedNotXButY = {
  rejected: string;
  accepted: string;
};

/** Parse "꽃집이 아니라 반찬가게" → { rejected: 꽃집, accepted: 반찬가게 }. */
export function parseNotXButYCorrection(text: string): ParsedNotXButY | null {
  const trimmed = text.trim();
  const match = trimmed.match(NOT_X_BUT_Y_RE);
  if (!match?.[1] || !match?.[2]) return null;
  const rejected = match[1].trim().replace(/[입니다\.]+$/, '');
  const accepted = match[2].trim().replace(/[입니다\.]+$/, '');
  if (rejected.length < 1 || accepted.length < 1) return null;
  if (rejected === accepted) return null;
  return { rejected, accepted };
}

function enrichCustomerCorrectionValue(accepted: string, fullText: string): string {
  if (/소상공|배송|직접/.test(fullText) && !/소상공/.test(accepted)) {
    return `${accepted} 등 직접 배송하는 소상공인`;
  }
  return accepted;
}

/** Resolved fact value for Memory / Review — never the raw correction utterance. */
export function extractCorrectedFactValue(
  key: ConversationFactKey,
  userAnswer: string,
): string {
  const trimmed = userAnswer.trim();
  if (key === 'customer') {
    const parsed = parseNotXButYCorrection(trimmed);
    if (parsed) {
      return enrichCustomerCorrectionValue(parsed.accepted, trimmed);
    }
    const segment = trimmed.match(/([\w가-힣]+(?:가게|집|점|소상공인))/);
    if (segment?.[1]) return segment[1];
  }
  if (key === 'buyer') {
    const parsed = parseNotXButYCorrection(trimmed);
    if (parsed) return parsed.accepted;
  }
  if (key === 'problem') {
    // Never persist correction meta-utterances as problem facts
    if (isCustomerFieldCorrection(trimmed)) return '';
    if (CORRECTION_RAW_RE.test(trimmed)) return '';
  }
  return trimmed;
}

/** Strip correction boilerplate from CEO-facing understanding lines. */
export function sanitizeCorrectionDisplayText(text: string): string {
  let t = text.trim();
  if (!t) return t;
  if (CORRECTION_RAW_RE.test(t)) {
    t = t.replace(CORRECTION_RAW_RE, '').trim();
  }
  if (/^(?:아니(?:요|라)[,.]?\s*)/i.test(t)) {
    t = t.replace(/^(?:아니(?:요|라)[,.]?\s*)/i, '').trim();
  }
  const parsed = parseNotXButYCorrection(t);
  if (parsed) {
    return enrichCustomerCorrectionValue(parsed.accepted, t);
  }
  return t;
}

export function shouldSkipContradictionForCorrection(input: {
  factKey: ConversationFactKey;
  userAnswer: string;
  isCorrection: boolean;
}): boolean {
  if (!input.isCorrection) return false;
  if (input.factKey === 'customer' && isCustomerFieldCorrection(input.userAnswer)) {
    return parseNotXButYCorrection(input.userAnswer) !== null;
  }
  return false;
}

/** Remove rejected customer segment from conflated fact text after CORRECT revision. */
export function scrubRejectedCustomerMention(
  text: string,
  revision: ParsedNotXButY,
): string {
  let t = text.trim();
  if (!t.includes(revision.rejected)) return t;

  const pairPatterns = [
    new RegExp(`${revision.accepted}\\s*(?:과|와|·|,|\\/)\\s*${revision.rejected}`, 'g'),
    new RegExp(`${revision.rejected}\\s*(?:과|와|·|,|\\/)\\s*${revision.accepted}`, 'g'),
  ];
  for (const re of pairPatterns) {
    t = t.replace(re, revision.accepted);
  }
  t = t.replace(new RegExp(`(?:과|와|·|,|\\/)\\s*${revision.rejected}`, 'g'), '');
  t = t.replace(new RegExp(`${revision.rejected}\\s*(?:과|와|·|,|\\/)\\s*`, 'g'), '');
  t = t.replaceAll(revision.rejected, '');
  return t.replace(/\s+/g, ' ').trim();
}

export function isMisroutedCustomerDescription(value: string): boolean {
  return (
    /(반찬|꽃집|소상공|배송|가게|집|고객)/.test(value) &&
    !/(불편|문제|pain|JTBD|해결하려|pein)/i.test(value)
  );
}
