/**
 * Phase 2-D F16 — 630-turn replay on the same AI PM runtime.
 * Mini 150 + ladder 300 + matrix 10×4×5 = 650. The 630 figure in Phase 2-A is this
 * pack minus the 20 duplicate mini-vs-ladder overlap that some reports dropped;
 * we replay the full 650 and fingerprint AI-facing fields only.
 */
import { describe, expect, it } from 'vitest';

import { runMatrixCalibrationSessions } from '../matrix-calibration-sessions';
import { runMiniSandboxPoc } from '../mini-sandbox-runner';
import { runScaleLadderStep2 } from '../scale-ladder-runner';
import type { MiniSandboxTurnRow } from '../mini-sandbox-runner';

function fingerprint(row: MiniSandboxTurnRow) {
  return {
    businessId: row.businessId,
    behavior: row.behavior,
    turn: row.turn,
    userInput: row.userInput,
    askedGapId: row.askedGapId,
    aiGapAfter: row.aiGapAfter,
  };
}

function replay650() {
  const mini = runMiniSandboxPoc().rows;
  const ladder = runScaleLadderStep2().rows;
  const matrix = runMatrixCalibrationSessions({
    perturbations: ['uncertainty', 'sparse', 'off_slot', 'normal'],
    maxTurns: 5,
  });
  return { mini, ladder, matrix, all: [...mini, ...ladder, ...matrix] };
}

describe('Phase 2-D F16 — 650-turn replay (mini+ladder+matrix)', () => {
  it('replays the calibration pack and counts F16 separately from AI state', () => {
    const { mini, ladder, matrix, all } = replay650();
    expect(mini.length).toBe(150);
    expect(ladder.length).toBe(300);
    expect(matrix.length).toBe(200);
    expect(all.length).toBe(650);

    const f16 = all.filter((r) => r.evaluation.failureType.includes('F16_WRONG_NEXT_QUESTION_RATIONALE'));
    const ai = all.map(fingerprint);

    expect(ai).toHaveLength(650);
    // After the intent check the production validation ask is not F16. Zero is an
    // evaluator result, not an AI PM fix — confirmed off-band vs the pre-F16
    // keyword checker (116 → 0, AI fingerprint identical).
    expect(f16).toHaveLength(0);
    expect(new Set(ai.map((r) => `${r.businessId}:${r.behavior}:${r.turn}:${r.askedGapId}`)).size).toBeGreaterThan(100);
  });
});
