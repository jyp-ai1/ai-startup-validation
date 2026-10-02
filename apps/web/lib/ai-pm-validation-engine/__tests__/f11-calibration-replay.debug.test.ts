import { describe, expect, it } from 'vitest';

import { replayCalibrationTurn } from '../calibration-turn-replay';
import { MINI_SANDBOX_BUSINESSES } from '../mini-sandbox-businesses';
import { runMiniSandboxPoc, runMiniSandboxSession } from '../mini-sandbox-runner';

describe('F11 — mini sandbox vs calibration replay', () => {
  it('sb-b2c-saas contradiction t4 surfaces customerPersona CONTRADICTED', () => {
    const biz = MINI_SANDBOX_BUSINESSES.find((b) => b.id === 'sb-b2c-saas')!;
    const rows = runMiniSandboxSession({ business: biz, behavior: 'contradiction' });
    const t4 = rows.find((r) => r.turn === 4)!;
    expect(t4.userInput).toContain('실제 최종 고객');
    expect(t4.aiGapAfter.customerPersona).toBe('CONTRADICTED');
  });

  it('calibration replay matches mini sandbox user agent on sandbox businesses', () => {
    const biz = MINI_SANDBOX_BUSINESSES.find((b) => b.id === 'sb-b2c-saas')!;
    const t4Row = runMiniSandboxSession({ business: biz, behavior: 'contradiction' }).find(
      (r) => r.turn === 4,
    )!;
    const replay = replayCalibrationTurn({
      businessId: 'sb-b2c-saas',
      behavior: 'contradiction',
      turn: 4,
    });
    expect(replay!.userInput).toBe(t4Row.userInput);
    expect(replay!.actualState.customerPersona).toBe('CONTRADICTED');
  });

  it('turn 4 contradiction rows surface CONTRADICTED (F11 core)', () => {
    const rows = runMiniSandboxPoc().rows.filter(
      (r) => r.behavior === 'contradiction' && r.turn === 4,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.aiGapAfter.customerPersona).toBe('CONTRADICTED');
    }
  });
});
