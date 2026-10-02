import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildCpoCalibrationSubmission,
  formatSummaryMarkdown,
} from '../cpo-calibration-submission';

describe('CPO Calibration submission (Phase 2)', () => {
  it('produces 50 enriched cases with adjudication and summary table', () => {
    const sub = buildCpoCalibrationSubmission();
    expect(sub.cases).toHaveLength(50);
    expect(sub.summaryTable).toHaveLength(5);

    for (const c of sub.cases) {
      expect(c.caseId).toBeTruthy();
      expect(c.actualFacts).not.toBe('null');
      expect(c.cpoRationale.length).toBeGreaterThan(10);
      expect(['PASS', 'PARTIAL', 'FAIL']).toContain(c.cpoCalibratedVerdict);
      expect(['AI_PM_DEFECT', 'EVALUATOR_DEFECT', 'GROUND_TRUTH_DEFECT']).toContain(
        c.calibrationClass,
      );
    }

    if (process.env.CPO_CALIBRATION_SUBMISSION_EVIDENCE === '1') {
      const outDir = join(
        process.cwd(),
        '../../docs/evidence/ALABOM/AI-PM-IMPROVEMENT-SPRINT-1/EVAL',
      );
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        join(outDir, 'cpo-calibration-submission.json'),
        JSON.stringify(sub, null, 2),
      );
      writeFileSync(
        join(outDir, 'cpo-calibration-summary.md'),
        formatSummaryMarkdown(sub),
      );
    }
  });
});
