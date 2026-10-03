import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildCpoImprovementCalibrationPack,
  CALIBRATION_CLUSTER_CODES,
} from '../cpo-improvement-calibration-pack';

describe('Improvement Sprint 1 — CPO calibration pack', () => {
  it('samples up to 10 cases per cluster and reports shortfalls', () => {
    const pack = buildCpoImprovementCalibrationPack();
    expect(pack.baselineTurns).toBeGreaterThanOrEqual(450);
    expect(CALIBRATION_CLUSTER_CODES).toHaveLength(5);

    let totalCases = 0;
    for (const code of CALIBRATION_CLUSTER_CODES) {
      const block = pack.clusters[code];
      expect(block.cases.length).toBe(Math.min(10, block.available));
      if (block.available < 10) {
        expect(pack.shortfalls.some((s) => s.startsWith(`${code}:`))).toBe(true);
      }
      totalCases += block.cases.length;
      for (const c of block.cases) {
        expect(c.cpoCalibratedVerdict).toBe('PENDING');
        expect(c.calibrationClass).toBe('PENDING');
        expect(c.cluster).toBe(code);
      }
    }
    expect(totalCases).toBeGreaterThan(0);
    expect(totalCases).toBeLessThanOrEqual(50);

    if (process.env.CPO_IMPROVEMENT_CALIBRATION_EVIDENCE === '1') {
      const outDir = join(
        process.cwd(),
        '../../docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/EVAL',
      );
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, 'cpo-improvement-calibration-pack.json'),
        JSON.stringify(pack, null, 2),
      );
    }
  });
});
