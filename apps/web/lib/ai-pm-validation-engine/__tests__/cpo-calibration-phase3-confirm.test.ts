import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildCpoImprovementCalibrationPack } from '../cpo-improvement-calibration-pack';

import { buildPhase3CalibrationConfirm } from '../cpo-calibration-phase3-confirm';
import { compareImprovementBaseline } from '../improvement-before-after';

describe('Phase 3 — calibration confirm + before/after', () => {
  it('produces CPO-confirmed table and fix cluster list', () => {
    const confirm = buildPhase3CalibrationConfirm();
    const pack = buildCpoImprovementCalibrationPack();
    // Clusters with no remaining auto failures sample fewer than 10 (see pack shortfalls).
    const sampled = Object.values(pack.clusters).reduce((n, block) => n + block.cases.length, 0);
    expect(confirm.cases).toHaveLength(sampled);
    expect(confirm.summaryTable).toHaveLength(5);

    const f08 = confirm.summaryTable.find((r) => r.cluster === 'F08_WRONG_GAP_PRIORITY');
    // F08 used to be padded with F16 keyword false-positives. After the F16 intent check,
    // evaluator count equals remaining F08 samples (0 when the cluster is empty).
    expect(f08?.evaluator).toBe(pack.clusters.F08_WRONG_GAP_PRIORITY.cases.length);
    expect(f08?.cpoConfirmed).toBe(0);

    if (process.env.CPO_CALIBRATION_PHASE3_EVIDENCE === '1') {
      const outDir = join(
        process.cwd(),
        '../../docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/EVAL',
      );
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, 'cpo-calibration-confirmed.json'),
        JSON.stringify(confirm, null, 2),
      );
      writeFileSync(
        join(outDir, 'improvement-before-after.json'),
        JSON.stringify(compareImprovementBaseline(), null, 2),
      );
    }
  });
});
