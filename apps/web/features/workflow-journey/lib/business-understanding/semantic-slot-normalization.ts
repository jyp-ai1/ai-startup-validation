/**
 * Sprint 1 — CPO 2-pass: slot value normalization + evidence discipline cues.
 * Splits multi-clause Korean answers; does not replace V3 SoT routing.
 */

import type { ConversationFactKey } from '@repo/types/domain/answer-review';

/** User hedge / unvalidated optimism — not FACT-worthy (Gate 7). */
export function isUserAssumptionUtterance(text: string): boolean {
  const t = text.trim();
  return /(아마|(?:할|낼)\s*것\s*같|것\s*같|추정|예상|느낌|생각해|될\s*것|일\s*것|분명히|불확실|검증하지|아직\s*확인|인터뷰만|몇\s*번\s*했)/i.test(
    t,
  );
}

/** Validation-grade evidence cues (interviews with counts, payment). */
export function hasValidationEvidenceCue(text: string): boolean {
  const t = text.trim();
  return /(\d+\s*(곳|개|명|건).*?(인터뷰|검증|확인)|유료\s*파일럿|실제\s*결제|LOI|계약)/i.test(t);
}

/** Market leadership / dominance rhetoric without validation data. */
export function isUnvalidatedMarketDominanceClaim(text: string): boolean {
  const t = text.trim();
  return /(시장\s*1\s*위|압도적|독점|무조건|분명히\s*시장|반드시\s*성공)/i.test(t);
}

/** Explicit competitor naming on wrong-slot answers (C — FACT when user says 경쟁사는 X). */
export function isExplicitCompetitorStatement(text: string): boolean {
  return /경쟁(?:사|서비스)(?:는|가)?\s*\S+/u.test(text.trim());
}

export function isOperationalRevenueStatement(text: string): boolean {
  return /(?:현재\s*)?(?:월\s*)?매출(?:은|이)?\s*[\d,.]+/u.test(text.trim());
}

export function isWtpHypothesisOnly(text: string): boolean {
  const t = text.trim();
  return (
    isUserAssumptionUtterance(t) &&
    /(돈|지불|낼|결제|wtp|pricing|가격)/i.test(t) &&
    !/(월\s*\d|만원|구독\s*료|실제\s*로\s*내)/i.test(t)
  );
}

function stripEnding(s: string): string {
  return s.replace(/\s*(입니다|이에요|예요|요)\.?$/u, '').trim();
}

/** Normalize extracted value per fact key — avoid full-utterance blob when clauses exist. */
export function normalizeSlotValue(key: ConversationFactKey, userAnswer: string): string | null {
  const t = userAnswer.trim();
  if (!t) return null;

  if (key === 'customer') {
    const labeled = t.match(/(?:우리\s*)?고객(?:은|이)\s*([^,，.]+?)(?:이고|이며|,|\.|$)/u);
    if (labeled?.[1]) return stripEnding(labeled[1]);

    const shortEntity = t.match(
      /^((?:소규모\s*)?양조장|소상공인\s*카페\s*사장(?:님)?|동네\s*음식점\s*사장(?:님)?)/u,
    );
    if (shortEntity?.[1]) return stripEnding(shortEntity[1]);

    if (/사장(?:님)?/u.test(t) && /(음식점|카페|양조장)/u.test(t)) {
      const m = t.match(/((?:동네\s*)?(?:음식점|카페)[^,.]*사장(?:님)?)/u);
      if (m?.[1]) return stripEnding(m[1]);
    }
  }

  if (key === 'problem') {
    const labeled = t.match(/문제(?:는|가)\s*([^,，.]+?)(?:이며|이고|,|\.|$)/u);
    if (labeled?.[1]) return stripEnding(labeled[1]);

    const sns = t.match(/(SNS[^,.]*(?:시간|홍보)[^,.]*)/iu);
    if (sns?.[1]) return stripEnding(sns[1]);

    if (/이고/u.test(t) && /(SNS|홍보)/u.test(t)) {
      const after = t.split(/이고/u).slice(1).join('이고');
      const clip = after.match(/([^,.]+(?:없|부족|어렵)[^.]*)/u);
      if (clip?.[1]) return stripEnding(clip[1]);
    }

    const pain = t.match(/(온라인\s*홍보[^,.]*(?:어렵|부족)[^.]*)/u);
    if (pain?.[1]) return stripEnding(pain[1]);
  }

  if (key === 'revenue') {
    const sales = t.match(
      /(?:현재\s*)?(?:월\s*)?매출(?:은|이)?\s*([0-9,.천백만억]+?\s*만?\s*원?)(?:이고|이며|,|\.|$)/u,
    );
    if (sales?.[1]) {
      const amt = stripEnding(sales[1]);
      return amt.startsWith('월') ? amt : `월 매출 ${amt}`;
    }
    const labeled = t.match(/(?:가격(?:은|이)|수익(?:은|이))\s*([^,，.]+?)(?:입니다|이며|이고|$)/u);
    if (labeled?.[1]) return stripEnding(labeled[1]);
    const monthly = t.match(/(월\s*[\d,.]+\s*만?\s*원?)/u);
    if (monthly?.[1]) return stripEnding(monthly[1]);
  }

  if (key === 'competitor') {
    const m = t.match(/경쟁(?:사| 서비스)(?:는|가)?\s*([^,，.]+)/u);
    if (m?.[1]) return stripEnding(m[1]);
  }

  return null;
}

/** True when normalized values differ per key (multi-slot not a duplicate blob). */
export function valuesAreDistinctAcrossKeys(
  values: Partial<Record<ConversationFactKey, string>>,
): boolean {
  const entries = Object.entries(values).filter(([, v]) => v && v.length > 0);
  if (entries.length < 2) return true;
  const uniq = new Set(entries.map(([, v]) => v!.trim()));
  return uniq.size === entries.length;
}
