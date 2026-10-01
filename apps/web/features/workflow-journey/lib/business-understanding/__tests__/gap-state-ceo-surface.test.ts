import { describe, expect, it } from 'vitest';

import {
  formatGapCeoSurfaceLine,
  resolveGapCeoSurfaceForRecord,
} from '../gap-state-ceo-surface';

describe('Track B — gap state CEO surface (reopen)', () => {
  it('maps CLOSED to SUFFICIENT', () => {
    expect(resolveGapCeoSurfaceForRecord({ completeness: 'CLOSED' })).toBe('SUFFICIENT');
  });

  it('maps reopen CLOSED → OPEN to UNVERIFIED', () => {
    expect(
      resolveGapCeoSurfaceForRecord(
        { completeness: 'OPEN' },
        { priorCompleteness: 'CLOSED' },
      ),
    ).toBe('UNVERIFIED');
  });

  it('maps reopen with CONTRADICTED to CONFLICT', () => {
    expect(
      resolveGapCeoSurfaceForRecord(
        { completeness: 'CONTRADICTED' },
        { priorCompleteness: 'CLOSED' },
      ),
    ).toBe('CONFLICT');
  });

  it('OPEN + ambiguous answer → AMBIGUOUS', () => {
    expect(
      resolveGapCeoSurfaceForRecord(
        { completeness: 'OPEN' },
        { answerLooksAmbiguous: true },
      ),
    ).toBe('AMBIGUOUS');
  });

  it('formatGapCeoSurfaceLine is user-facing Korean', () => {
    const line = formatGapCeoSurfaceLine({
      gapLabel: '고객',
      record: { completeness: 'PARTIAL' },
    });
    expect(line).toContain('고객');
    expect(line).toContain('검증');
  });
});
