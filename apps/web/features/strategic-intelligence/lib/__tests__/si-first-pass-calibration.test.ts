import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence, judgmentContainsScore } from '../analyze-strategic-intelligence';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { FIRST_PASS_REFEREE } from './si-first-pass-referee';
import { scoreSiFirstPass } from './score-si-first-pass';

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-first-pass-calibration.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

describe('S.I. First-Pass Judgment Calibration Gate', () => {
  it('does not rewrite the analyzer or special-case brands', () => {
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(ANALYZER_SRC).not.toMatch(/주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i);
  });

  it.each(CASE_IDS)('%s: t0 first-pass has the six judgment fields and no score', (id) => {
    const fixture = getSiCalibrationCase(id);
    const judgment = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    expect(judgmentContainsScore(judgment.judgment)).toBe(false);
    expect(judgment.judgment.length).toBeGreaterThan(8);
    expect(judgment.whyPossible.length).toBeGreaterThan(8);
    expect(judgment.whyFail.length).toBeGreaterThan(8);
    expect(judgment.criticalUnknown.length).toBeGreaterThan(8);
    expect(judgment.decisionChangingEvidence.length).toBeGreaterThan(8);
    expect(judgment.validationPriority.length).toBeGreaterThan(8);
  });

  it('writes the five-business first-pass comparison dump', () => {
    const rows = CASE_IDS.map((id) => {
      const fixture = getSiCalibrationCase(id);
      const referee = FIRST_PASS_REFEREE[id];
      const judgment = analyzeStrategicIntelligence({
        title: fixture.title,
        documentText: fixture.documentText,
      });
      const scored = scoreSiFirstPass(judgment, referee);
      return {
        id,
        si: {
          verdictId: judgment.verdictId,
          stageId: judgment.stageId,
          executiveJudgment: judgment.judgment,
          whyItCanWin: judgment.whyPossible,
          whyItCanFail: judgment.whyFail,
          criticalUnknown: judgment.criticalUnknown,
          decisionChangingEvidence: judgment.decisionChangingEvidence,
          validationPriority: judgment.validationPriority,
        },
        referee: {
          verdictId: referee.verdictId,
          executiveJudgment: referee.executiveJudgment,
          whyItCanWin: referee.whyItCanWin,
          whyItCanFail: referee.whyItCanFail,
          criticalUnknown: referee.criticalUnknown,
          decisionChangingEvidence: referee.decisionChangingEvidence,
          validationPriority: referee.validationPriority,
        },
        axes: scored.axes,
        overall: scored.overall,
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.axes.length === 6)).toBe(true);
    expect(rows.filter((row) => row.overall === 'FAIL')).toHaveLength(0);
    expect(rows.find((row) => row.id === 'lmulm')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'juinjip')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'ridm')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'clinicflow')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'fitbridge')?.overall).toBe('PASS');
  });
});
