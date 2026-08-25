import { describe, expect, it } from 'vitest';

import {
  BUSINESS_UNDERSTANDING_DOMAIN,
  isInferenceNotFact,
  mapDocumentFirstSourceToProvenance,
  shouldSkipReask,
  UNDERSTANDING_CONFIDENCE,
  UNDERSTANDING_PROVENANCE,
} from '../understanding-contract';

describe('understanding-contract (W3 foundations)', () => {
  it('locks provenance and confidence enums', () => {
    expect(UNDERSTANDING_PROVENANCE).toContain('DOCUMENT');
    expect(UNDERSTANDING_PROVENANCE).toContain('AI_INFERENCE');
    expect(UNDERSTANDING_PROVENANCE).toContain('USER_CORRECTED');
    expect(UNDERSTANDING_CONFIDENCE).toEqual([
      'UNKNOWN',
      'INFERRED',
      'PROPOSED',
      'USER_CONFIRMED',
      'VALIDATED',
    ]);
  });

  it('treats Domain 01–20 as fields (20 keys)', () => {
    expect(BUSINESS_UNDERSTANDING_DOMAIN).toHaveLength(20);
    expect(BUSINESS_UNDERSTANDING_DOMAIN[0]?.key).toBe('businessOneLiner');
    expect(BUSINESS_UNDERSTANDING_DOMAIN[19]?.key).toBe('nextAction');
  });

  it('maps legacy document-first sources and inference≠fact', () => {
    expect(mapDocumentFirstSourceToProvenance('document')).toBe('DOCUMENT');
    expect(mapDocumentFirstSourceToProvenance('inferred')).toBe('AI_INFERENCE');
    expect(isInferenceNotFact('AI_INFERENCE')).toBe(true);
    expect(isInferenceNotFact('USER_CONFIRMED')).toBe(false);
    expect(shouldSkipReask('VALIDATED')).toBe(true);
    expect(shouldSkipReask('INFERRED')).toBe(false);
  });
});
