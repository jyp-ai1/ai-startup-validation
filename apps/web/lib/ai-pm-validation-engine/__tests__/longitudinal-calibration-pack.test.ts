import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildLongitudinalCalibrationPack } from '../longitudinal-calibration-replay';

describe('Sprint 2 — longitudinal calibration pack', () => {
  it('builds checkpoints for all mini-sandbox archetypes', () => {
    const pack = buildLongitudinalCalibrationPack();
    expect(pack.scenarios.length).toBeGreaterThanOrEqual(16);
    const p0 = pack.scenarios.filter((s) => s.behavior === 'longitudinal_f11');
    expect(p0.length).toBe(10);
    for (const scenario of p0) {
      const t5 = scenario.checkpoints.find((c) => c.turn === 5);
      expect(t5, `${scenario.businessId} turn 5`).toBeTruthy();
    }
  });

  it('writes evidence when LONGITUDINAL_CALIBRATION_EVIDENCE=1', () => {
    if (process.env.LONGITUDINAL_CALIBRATION_EVIDENCE !== '1') return;
    const pack = buildLongitudinalCalibrationPack();
    const outDir = path.join(
      process.cwd(),
      '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/EVAL',
    );
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'longitudinal-calibration-pack.json');
    writeFileSync(outPath, `${JSON.stringify(pack, null, 2)}\n`);
    expect(existsSync(outPath)).toBe(true);
  });
});
