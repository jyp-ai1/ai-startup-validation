import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { SI_CALIBRATION_CASES } from '../si-calibration-cases';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-calibration-output.json',
);

describe('S.I. V1 calibration dump', () => {
  it('writes the five first judgments for the calibration report', () => {
    const rows = Object.values(SI_CALIBRATION_CASES).map((fixture) => {
      const judgment = analyzeStrategicIntelligence({
        title: fixture.title,
        documentText: fixture.documentText,
      });
      return {
        id: fixture.id,
        title: fixture.title,
        verdictId: judgment.verdictId,
        stageId: judgment.stageId,
        judgment: judgment.judgment,
        whyPossible: judgment.whyPossible,
        whyFail: judgment.whyFail,
        strengths: judgment.strengths,
        risks: judgment.risks,
        criticalUnknown: judgment.criticalUnknown,
        decisionChangingEvidence: judgment.decisionChangingEvidence,
        validationPriority: judgment.validationPriority,
        evidenceMap: judgment.evidenceMap,
        axes: judgment.axes,
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.id).sort()).toEqual(
      ['clinicflow', 'fitbridge', 'juinjip', 'lmulm', 'ridm'].sort(),
    );
  });
});
