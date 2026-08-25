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
  source: 'document' | 'inferred' | 'unknown',
): UnderstandingProvenance {
  if (source === 'document') return 'DOCUMENT';
  if (source === 'inferred') return 'AI_INFERENCE';
  return 'UNKNOWN';
}

/** Inference must never be treated as settled user fact. */
export function isInferenceNotFact(provenance: UnderstandingProvenance): boolean {
  return provenance === 'AI_INFERENCE' || provenance === 'UNKNOWN';
}

/** Skip re-ask when confidence is strong enough (unless Contradiction / user edit). */
export function shouldSkipReask(confidence: UnderstandingConfidence): boolean {
  return confidence === 'USER_CONFIRMED' || confidence === 'VALIDATED';
}
