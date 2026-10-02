import { describe, expect, it } from 'vitest';

import { runHoldoutEvaluation } from '../holdout-runner';

/** Holdout biz-16/17 — one-shot, no tuning (CPO STEP 7). */
describe('Phase 3-B holdout (biz-16, biz-17)', () => {
  it('runs isolated holdout and reports failure mining', () => {
    const pack = runHoldoutEvaluation({ maxTurns: 5 });
    expect(pack.isolationVerified).toBe(true);
    expect(pack.holdoutIds).toEqual(['biz-16', 'biz-17']);
  });

  it('F11 turn-4 contradiction on holdout marks CONTRADICTED when applicable', () => {
    const pack = runHoldoutEvaluation({ maxTurns: 5 });
    const t4 = pack.rows.filter((r) => r.behavior === 'contradiction' && r.turn === 4);
    expect(t4.length).toBe(2);
    for (const row of t4) {
      expect(row.aiGapAfter.customerPersona).toBe('CONTRADICTED');
    }
  });
});
