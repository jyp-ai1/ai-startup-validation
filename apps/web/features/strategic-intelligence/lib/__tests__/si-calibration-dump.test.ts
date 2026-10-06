import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { SI_CALIBRATION_CASES } from '../si-calibration-cases';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/si-v1-calibration-output.json',
);

describe('S.I. V1 calibration dump', () => {
  it('matches the committed first-judgment snapshot', () => {
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

    const snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as unknown;
    expect(rows).toEqual(snapshot);
  });
});
