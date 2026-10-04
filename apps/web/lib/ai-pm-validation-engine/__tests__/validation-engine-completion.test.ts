import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { mineFailures } from '../failure-mining';
import { assertHoldoutIsolation, runHoldoutEvaluation } from '../holdout-runner';
import { runMiniSandboxPoc } from '../mini-sandbox-runner';
import { runScaleLadderStep2 } from '../scale-ladder-runner';
import { runSeedFailureRegression } from '../seed-regression-runner';
import { buildValidationEngineCompletionPack } from '../validation-engine-completion';

describe('validation engine — sprint completion pack', () => {
  it('holdout is isolated from development mini-sandbox ids', () => {
    const poc = runMiniSandboxPoc();
    const devIds = poc.rows.map((r) => r.businessId);
    expect(assertHoldoutIsolation([...new Set(devIds)])).toBe(true);
  });

  it('holdout runs biz-16 and biz-17 only', () => {
    const pack = runHoldoutEvaluation({ maxTurns: 3 });
    expect(pack.holdoutIds).toEqual(['biz-16', 'biz-17']);
    expect(pack.isolationVerified).toBe(true);
    expect(pack.matrix.totalTurns).toBe(2 * 3 * 3);
  });

  it('scale ladder step2 is 10×6×5', () => {
    const pack = runScaleLadderStep2(5);
    expect(pack.matrix.totalTurns).toBe(300);
    expect(mineFailures(pack.rows).totalTurns).toBe(300);
  });

  it('seed regression covers A–F', () => {
    const seeds = runSeedFailureRegression(3);
    expect(seeds.results.map((r) => r.seedId).sort()).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });

  it('builds full completion pack', () => {
    const pack = buildValidationEngineCompletionPack(
      process.env.ACCURACY_GIT_SHA ?? 'local',
    );
    expect(pack.miniSandbox.matrix.totalTurns).toBe(150);
    expect(pack.scaleLadder.matrix.totalTurns).toBe(300);
    // Clusters exist only on failed turns. Zero failures is a valid mining result, not a pack error.
    if (pack.failureMining.failedTurns > 0) {
      expect(pack.failureMining.clusters.length).toBeGreaterThan(0);
    } else {
      expect(pack.failureMining.clusters).toEqual([]);
    }

    if (process.env.VALIDATION_ENGINE_COMPLETION === '1') {
      const evalDir = join(
        process.cwd(),
        '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
      );
      mkdirSync(evalDir, { recursive: true });
      writeFileSync(
        join(evalDir, 'validation-engine-completion-pack.json'),
        JSON.stringify(
          {
            ...pack,
            miniSandbox: { ...pack.miniSandbox, rows: undefined },
            scaleLadder: { ...pack.scaleLadder, rows: undefined },
            holdout: { ...pack.holdout, rows: undefined },
          },
          null,
          2,
        ),
      );
      writeFileSync(
        join(evalDir, 'failure-mining-report.json'),
        JSON.stringify(pack.failureMining, null, 2),
      );
      writeFileSync(
        join(evalDir, 'holdout-results.json'),
        JSON.stringify(
          { ...pack.holdout, rows: pack.holdout.rows.slice(0, 20) },
          null,
          2,
        ),
      );
      writeFileSync(
        join(evalDir, 'cpo-calibration-compare.json'),
        JSON.stringify(pack.calibration, null, 2),
      );
    }
  });
});
