import type { V2EvidenceField, V2ValidationEvidence } from './v2-validation-store';
import { isEvidenceFieldFilled } from './v2-validation-store';

export type UnderstandingFieldKey = 'idea' | V2EvidenceField;

export const UNDERSTANDING_FIELDS: UnderstandingFieldKey[] = [
  'idea',
  'problem',
  'customer',
  'pricing',
  'mvp',
];

export type EvidenceStrength = 'strong' | 'partial' | 'none';

export function strengthForField(
  field: UnderstandingFieldKey,
  evidence: V2ValidationEvidence,
): EvidenceStrength {
  return isEvidenceFieldFilled(field, evidence) ? 'strong' : 'none';
}

export function getEvidenceValue(
  field: UnderstandingFieldKey,
  evidence: V2ValidationEvidence,
): string | undefined {
  if (field === 'idea') return evidence.idea.trim() || undefined;
  return evidence[field]?.trim() || undefined;
}

export function listMissingFields(evidence: V2ValidationEvidence): UnderstandingFieldKey[] {
  return UNDERSTANDING_FIELDS.filter((field) => !isEvidenceFieldFilled(field, evidence));
}

export function countStrongFields(evidence: V2ValidationEvidence): number {
  return UNDERSTANDING_FIELDS.filter((field) => isEvidenceFieldFilled(field, evidence)).length;
}

export const REVIEW_CONFIRMED_MOCK_KEYS = [
  'similarServices',
  'productHunt',
  'localCompetitors',
  'marketSize',
] as const;

export type ReviewConfirmedKey = (typeof REVIEW_CONFIRMED_MOCK_KEYS)[number];
