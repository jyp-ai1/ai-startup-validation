import { readFileSync } from 'node:fs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { diagnoseGapLoopVsSi } from '../diagnose-gap-loop-vs-si';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';

const DIAG_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../diagnose-gap-loop-vs-si.ts'),
  'utf8',
);

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-gap-loop-diagnostic.json',
);

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;

describe('S.I. vs Gap Loop diagnostic', () => {
  it('is read-only: does not rewrite decideNextQuestionFromReview', () => {
    expect(DIAG_SRC).toMatch(/decideNextQuestionFromReview\(/);
    expect(DIAG_SRC).not.toMatch(/export function decideNextQuestionFromReview/);
    expect(DIAG_SRC).not.toMatch(/주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i);
  });

  it('compares five calibrations and writes the dump', () => {
    const rows = CASE_IDS.map((id) => {
      const fixture = getSiCalibrationCase(id);
      return diagnoseGapLoopVsSi({
        id,
        title: fixture.title,
        documentText: fixture.documentText,
      });
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.engineFirst.source).toBe('decideNextQuestionFromReview');
      expect(row.engineFirst.targetGapId).toBe('businessOneLiner');
      expect(row.si.questionText).not.toBe(row.engineFirst.questionText);
      expect(row.dimensions.engineAnswerEntersSiEvidence).toBe(false);
      expect(row.dimensions.engineAskCanMoveSiJudgment).toBe(false);
      expect(row.dimensions.engineOverwritesSi).toBe(false);
      expect(['A', 'B', 'C', 'D']).toContain(row.classification);
    }
    expect(rows.every((row) => row.classification === 'B')).toBe(true);
  });
});
