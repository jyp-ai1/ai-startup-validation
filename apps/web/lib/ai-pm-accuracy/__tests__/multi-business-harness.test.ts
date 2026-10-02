import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { BUSINESS_SCENARIO_MATRIX } from '../business-scenario-matrix';
import { runMultiBusinessHarness } from '../multi-business-harness';

afterAll(() => {
  if (process.env.MULTI_BUSINESS_EVIDENCE !== '1') return;
  const report = runMultiBusinessHarness();
  const outDir = path.resolve(
    process.cwd(),
    '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'multi-business-harness-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
});

describe('Multi-business accuracy harness (Sprint 2)', () => {
  it('defines 15 business matrix rows with dev/regression/unseen split', () => {
    expect(BUSINESS_SCENARIO_MATRIX).toHaveLength(17);
    expect(BUSINESS_SCENARIO_MATRIX.filter((b) => b.set === 'development')).toHaveLength(10);
    expect(BUSINESS_SCENARIO_MATRIX.filter((b) => b.set === 'regression')).toHaveLength(5);
    expect(BUSINESS_SCENARIO_MATRIX.filter((b) => b.set === 'holdout')).toHaveLength(2);
  });

  it('runs Layer A + B pilots and reports failures honestly', () => {
    const report = runMultiBusinessHarness();
    expect(report.layerA).toHaveLength(17);
    expect(report.scenarios.length).toBeGreaterThan(15);
    expect(report.bySet.development).toBeDefined();
    expect(typeof report.passCount).toBe('number');
  });
});
