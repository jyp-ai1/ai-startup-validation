import { describe, expect, it } from 'vitest';

import {
  gapCeoSurfaceFromAnswer,
  gapCeoSurfaceKind,
  gapCeoSurfaceLabel,
} from '../gap-ceo-surface-label';

describe('Track B — gap CEO surface labels', () => {
  it('maps V3 completeness without changing SoT values', () => {
    expect(gapCeoSurfaceKind('CLOSED')).toBe('SUFFICIENT');
    expect(gapCeoSurfaceKind('CONTRADICTED')).toBe('CONFLICT');
    expect(gapCeoSurfaceKind('PARTIAL')).toBe('UNVERIFIED');
    expect(gapCeoSurfaceKind('OPEN')).toBe('MISSING');
  });

  it('exposes natural language labels for CEO UI', () => {
    expect(gapCeoSurfaceLabel('CONFLICT')).toContain('충돌');
    expect(gapCeoSurfaceLabel('MISSING')).toContain('확인');
  });

  it('treats ambiguous hedges as AMBIGUOUS when gap still OPEN', () => {
    expect(
      gapCeoSurfaceFromAnswer({ completeness: 'OPEN', answerLooksAmbiguous: true }),
    ).toBe('AMBIGUOUS');
  });
});
