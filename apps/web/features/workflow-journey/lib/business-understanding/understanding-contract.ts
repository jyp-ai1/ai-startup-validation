/**
 * ALABOM Long Sprint — Understanding Engine contracts (W3 foundations).
 * Product language from docs/sprints/ALABOM_PHASE1B_SCOPE.md §§4–7.
 * Presenter/Flow may phrase freely; these enums must not silently equal “user fact.”
 */

/** Source Provenance — every claim carries a Source. */
export const UNDERSTANDING_PROVENANCE = [
  'DOCUMENT',
  'USER_CONFIRMED',
  'USER_CORRECTED',
  'AI_INFERENCE',
  'EXTERNAL_EVIDENCE',
  'UNKNOWN',
] as const;

export type UnderstandingProvenance = (typeof UNDERSTANDING_PROVENANCE)[number];

/** Confidence ladder — AI inference ≠ fact. */
export const UNDERSTANDING_CONFIDENCE = [
  'UNKNOWN',
  'INFERRED',
  'PROPOSED',
  'USER_CONFIRMED',
  'VALIDATED',
] as const;

export type UnderstandingConfidence = (typeof UNDERSTANDING_CONFIDENCE)[number];

/** Answer Quality — do not PASS by length. */
export const ANSWER_QUALITY = [
  'VALID',
  'PARTIAL',
  'AMBIGUOUS',
  'IRRELEVANT',
  'CONTRADICTORY',
  'UNKNOWN',
] as const;

export type AnswerQuality = (typeof ANSWER_QUALITY)[number];

/** Domain 01–20 — understanding fields, not a 20-question form. */
export const BUSINESS_UNDERSTANDING_DOMAIN = [
  { id: '01', key: 'businessOneLiner', stage: 'A' },
  { id: '02', key: 'categoryScope', stage: 'A' },
  { id: '03', key: 'customerPersona', stage: 'A' },
  { id: '04', key: 'payer', stage: 'A' },
  { id: '05', key: 'problemJtbd', stage: 'A' },
  { id: '06', key: 'problemFrequencySeverity', stage: 'A' },
  { id: '07', key: 'solution', stage: 'A' },
  { id: '08', key: 'differentiationHypothesis', stage: 'A' },
  { id: '09', key: 'revenueModel', stage: 'A' },
  { id: '10', key: 'pricingHint', stage: 'A' },
  { id: '11', key: 'marketChannel', stage: 'B' },
  { id: '12', key: 'marketSizeEvidence', stage: 'B' },
  { id: '13', key: 'alternativesCompetitors', stage: 'B' },
  { id: '14', key: 'differentiationVsAlternatives', stage: 'B' },
  { id: '15', key: 'topRisks', stage: 'C' },
  { id: '16', key: 'validationTestability', stage: 'B' },
  { id: '17', key: 'executionConstraints', stage: 'C' },
  { id: '18', key: 'evidenceStrengthSummary', stage: 'B' },
  { id: '19', key: 'currentJudgment', stage: 'D' },
  { id: '20', key: 'nextAction', stage: 'D' },
] as const;

export type BusinessUnderstandingDomainKey =
  (typeof BUSINESS_UNDERSTANDING_DOMAIN)[number]['key'];

export type UnderstandingClaim = {
  fieldKey: BusinessUnderstandingDomainKey | string;
  value: string;
  provenance: UnderstandingProvenance;
  confidence: UnderstandingConfidence;
};

/** Map legacy Document First sources → Long Sprint provenance. */
export function mapDocumentFirstSourceToProvenance(
  source: 'document' | 'inferred' | 'unknown' | 'confirmed',
): UnderstandingProvenance {
  if (source === 'document') return 'DOCUMENT';
  if (source === 'inferred') return 'AI_INFERENCE';
  if (source === 'confirmed') return 'USER_CONFIRMED';
  return 'UNKNOWN';
}

/** Reverse map for Presenter surfaces that still key off legacy labels. */
export function mapProvenanceToDocumentFirstSource(
  provenance: UnderstandingProvenance,
): 'document' | 'inferred' | 'unknown' | 'confirmed' {
  if (provenance === 'DOCUMENT') return 'document';
  if (provenance === 'AI_INFERENCE' || provenance === 'EXTERNAL_EVIDENCE') return 'inferred';
  if (provenance === 'USER_CONFIRMED' || provenance === 'USER_CORRECTED') return 'confirmed';
  return 'unknown';
}

/** Default confidence ladder from provenance (Presenter may raise on confirm). */
export function confidenceFromProvenance(
  provenance: UnderstandingProvenance,
): UnderstandingConfidence {
  switch (provenance) {
    case 'DOCUMENT':
      return 'PROPOSED';
    case 'AI_INFERENCE':
      return 'INFERRED';
    case 'USER_CONFIRMED':
      return 'USER_CONFIRMED';
    case 'USER_CORRECTED':
      return 'USER_CONFIRMED';
    case 'EXTERNAL_EVIDENCE':
      return 'PROPOSED';
    default:
      return 'UNKNOWN';
  }
}

/** Inference must never be treated as settled user fact. */
export function isInferenceNotFact(provenance: UnderstandingProvenance): boolean {
  return provenance === 'AI_INFERENCE' || provenance === 'UNKNOWN';
}

/** Skip re-ask when confidence is strong enough (unless Contradiction / user edit). */
export function shouldSkipReask(confidence: UnderstandingConfidence): boolean {
  return confidence === 'USER_CONFIRMED' || confidence === 'VALIDATED';
}

const NONSENSE_RE =
  /^(.)\1{3,}$|^(asdf+|qwer+|test+|testing+|xxx+|ㄴㄴㄴ+|ㅋㅋㅋ+|ㅎㅎㅎ+|aaa+|zzz+|lalala+|blah+|foo+|bar+)$/i;
const UNKNOWN_SIGNAL_RE = /^(모름|몰라요|모르겠|잘\s*모르|unknown|n\/?a|없음|없어요)\.?$/i;
const PUNCT_ONLY_RE = /^[\p{P}\p{S}\d\s]+$/u;
const KEYBOARD_MASH_RE = /^(?:[a-z]{1,2}\s*){4,}$/i;
const HANGUL_JAMO_MASH_RE = /^[\u3131-\u318E\s]{4,}$/;

function isHangulJamoMash(trimmed: string): boolean {
  if (HANGUL_JAMO_MASH_RE.test(trimmed)) return true;
  const compact = trimmed.replace(/\s/g, '');
  const jamoCount = (compact.match(/[\u3131-\u318E]/g) ?? []).length;
  return jamoCount >= 4 && jamoCount / Math.max(compact.length, 1) >= 0.6;
}

/**
 * Answer Quality Engine — never mark VALID by length alone.
 * CONTRADICTORY when answer conflicts with a known confirmed fact.
 * Nonsense must not merge as Understanding (re-ask, keep draft).
 */
export function evaluateAnswerQuality(
  answer: string,
  options?: { existingFact?: string | null },
): { quality: AnswerQuality; mergeable: boolean } {
  const trimmed = answer.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) {
    return { quality: 'UNKNOWN', mergeable: false };
  }
  if (UNKNOWN_SIGNAL_RE.test(trimmed)) {
    return { quality: 'UNKNOWN', mergeable: false };
  }
  if (
    NONSENSE_RE.test(trimmed) ||
    PUNCT_ONLY_RE.test(trimmed) ||
    KEYBOARD_MASH_RE.test(trimmed) ||
    isHangulJamoMash(trimmed) ||
    trimmed.length < 4
  ) {
    return { quality: 'IRRELEVANT', mergeable: false };
  }

  const existing = options?.existingFact?.trim().replace(/\s+/g, ' ') ?? '';
  if (existing.length >= 4 && answersContradict(existing, trimmed)) {
    return { quality: 'CONTRADICTORY', mergeable: false };
  }

  if (trimmed.length < 12 || /^(네|아니요|ㅇㅇ|ㄴㄴ|yes|no)\.?$/i.test(trimmed)) {
    return { quality: 'PARTIAL', mergeable: true };
  }

  return { quality: 'VALID', mergeable: true };
}

/** Lightweight contradiction: both claims look like replacements of the same slot. */
export function answersContradict(prior: string, next: string): boolean {
  const a = prior.trim().replace(/\s+/g, ' ').toLowerCase();
  const b = next.trim().replace(/\s+/g, ' ').toLowerCase();
  if (!a || !b || a === b) return false;
  if (a.includes(b) || b.includes(a)) return false;
  // Distinct short noun phrases that share almost no tokens → treat as conflict
  const tokensA = new Set(a.split(/[\s,/·]+/).filter((t) => t.length >= 2));
  const tokensB = new Set(b.split(/[\s,/·]+/).filter((t) => t.length >= 2));
  if (tokensA.size === 0 || tokensB.size === 0) return false;
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap += 1;
  }
  const ratio = overlap / Math.min(tokensA.size, tokensB.size);
  return ratio < 0.2 && Math.abs(tokensA.size - tokensB.size) <= 3;
}

/** Quality that may enter Memory / Understanding as user-backed. */
export function isMergeableAnswerQuality(quality: AnswerQuality): boolean {
  return quality === 'VALID' || quality === 'PARTIAL';
}
