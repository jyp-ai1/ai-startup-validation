import fs from 'node:fs';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

import { runCrossBusinessFailureSearch } from '../cross-business-failure-search';
import { CROSS_BUSINESS_PERTURBATION_CELLS } from '../cross-business-perturbation-matrix';
import { BUSINESS_SCENARIO_MATRIX } from '../business-scenario-matrix';

const evidenceRoot = path.resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL',
);

afterAll(() => {
  if (process.env.CROSS_BUSINESS_SEARCH !== '1') return;
  const report = runCrossBusinessFailureSearch();
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(
    path.join(evidenceRoot, 'cross-business-failure-search.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
});

describe('Cross-business failure search', () => {
  it('runs 15 × perturbation matrix', () => {
    expect(BUSINESS_SCENARIO_MATRIX.length).toBe(15);
    expect(CROSS_BUSINESS_PERTURBATION_CELLS.length).toBeGreaterThanOrEqual(10);
    const report = runCrossBusinessFailureSearch();
    expect(report.matrixSize.cells).toBe(
      BUSINESS_SCENARIO_MATRIX.length * CROSS_BUSINESS_PERTURBATION_CELLS.length,
    );
    expect(report.cells.length).toBe(report.matrixSize.cells);
  });
});
