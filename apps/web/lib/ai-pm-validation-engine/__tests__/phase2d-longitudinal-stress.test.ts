/**
 * Phase 2-D — committed smoke for the longitudinal stress runner.
 * Full 10×2×{10,20,30,40} matrix is run out of band (STRESS_OUT); this file
 * only proves the adaptive loop is wired to the production decision path.
 */
import { describe, expect, it } from 'vitest';

import { STRESS_BUSINESS_UNIVERSE } from '../stress/stress-business-universe';
import { runStressSession, summarizeStress } from '../stress/longitudinal-stress-runner';

describe('Phase 2-D longitudinal stress runner', () => {
  it('follows the AI PM next question for 10 turns on two archetypes', () => {
    const truths = STRESS_BUSINESS_UNIVERSE.filter((t) => t.id.endsWith('-1')).slice(0, 2);
    const results = truths.map((truth) => runStressSession({ truth, sessionLength: 10 }));
    expect(results).toHaveLength(2);
    for (const s of results) {
      expect(s.turnsRun).toBeGreaterThanOrEqual(4);
      expect(s.rows[0]?.askedGapId).toBeTruthy();
      expect(s.rows.some((r) => r.userAnswer.length > 0)).toBe(true);
    }
    const summary = summarizeStress(results);
    expect(summary.sessions).toBe(2);
    expect(summary.turns).toBeGreaterThan(0);
  });

  // Defect E — reproduce only. applyNoGapTermination ignores never-asked required gaps.
  it.fails('the production path does not stop while a required Stage gap is still open', () => {
    const s = runStressSession({
      truth: STRESS_BUSINESS_UNIVERSE[0]!,
      sessionLength: 40,
    });
    expect(s.prematureStopAfterTurn).toBeNull();
  });
});
