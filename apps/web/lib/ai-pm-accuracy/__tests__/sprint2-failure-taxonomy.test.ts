import { describe, expect, it } from 'vitest';

import { sprint2CodesFromHarness } from '../sprint2-failure-taxonomy';

describe('Sprint 2 failure taxonomy', () => {
  it('maps harness F3 off-slot gap miss to F07', () => {
    const codes = sprint2CodesFromHarness(['F3_GAP_MISCLASSIFICATION']);
    expect(codes).toContain('F07_OPEN_GAP_MISSED');
  });
});
