import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { FOUNDER_OUTCOME_REFEREE } from './si-founder-outcome-referee';
import { scoreSiFounderOutcome } from './score-si-founder-outcome';

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-outcome.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const SCORER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-founder-outcome.ts'),
  'utf8',
);

function runOutcome(id: (typeof CASE_IDS)[number]) {
  const fixture = getSiCalibrationCase(id);
  const t0 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
  });
  const answer = pickSiIntegrationAnswer(t0.firstQuestion.kind, 'validated');
  const t1 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
    founderAnswer: answer,
  });
  const answerEnteredEvidence =
    t1.current.update?.source === 'si-v1-update' &&
    t1.current.update.addedEvidence[0]?.evidenceClass === 'VALIDATED' &&
    t1.current.update.addedEvidence[0]?.text === answer;
  const scored = scoreSiFounderOutcome({
    id,
    t0: t0.firstJudgment,
    question: t0.firstQuestion,
    answer,
    t1: t1.current.judgment,
    answerEnteredEvidence,
    referee: FOUNDER_OUTCOME_REFEREE[id],
  });
  return { fixture, t0, t1, answer, scored };
}

describe('S.I. Decision Quality / Founder Outcome Calibration — measure only', () => {
  it('does not rewrite the engine or special-case brands in runtime', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(SCORER_SRC).not.toMatch(/from ['"].*analyze-strategic-intelligence['"]/);
  });

  it.each(CASE_IDS)('%s: records the eight Founder-outcome fields', (id) => {
    const { t0, scored } = runOutcome(id);
    expect(t0.firstJudgment.judgment.length).toBeGreaterThan(8);
    expect(t0.firstJudgment.whyFail.length).toBeGreaterThan(8);
    expect(t0.firstJudgment.criticalUnknown.length).toBeGreaterThan(8);
    expect(t0.firstJudgment.decisionChangingEvidence.length).toBeGreaterThan(8);
    expect(t0.firstJudgment.validationPriority.length).toBeGreaterThan(8);
    expect(t0.firstQuestion.questionText.length).toBeGreaterThan(8);
    expect(scored.axes).toHaveLength(8);
    expect(scored.brief.validate.length).toBeGreaterThan(8);
    expect(scored.brief.stop.length).toBeGreaterThan(8);
    expect(scored.brief.focus.length).toBeGreaterThan(8);
  });

  it('writes the five-business Founder-outcome dump without changing the engine', () => {
    const rows = CASE_IDS.map((id) => {
      const { t0, t1, answer, scored } = runOutcome(id);
      return {
        id,
        directionMatch: scored.directionMatch,
        founderOutcome: scored.overall,
        t0: {
          verdictId: t0.firstJudgment.verdictId,
          stageId: t0.firstJudgment.stageId,
          judgment: t0.firstJudgment.judgment,
          whyFail: t0.firstJudgment.whyFail,
          criticalUnknown: t0.firstJudgment.criticalUnknown,
          decisionChangingEvidence: t0.firstJudgment.decisionChangingEvidence,
          validationPriority: t0.firstJudgment.validationPriority,
          question: t0.firstQuestion.questionText,
        },
        answer,
        t1: {
          verdictId: t1.current.judgment.verdictId,
          stageId: t1.current.judgment.stageId,
          judgment: t1.current.judgment.judgment,
          criticalUnknown: t1.current.judgment.criticalUnknown,
          validationPriority: t1.current.judgment.validationPriority,
          evidenceEntered: t1.current.update?.addedEvidence[0]?.evidenceClass === 'VALIDATED',
        },
        brief: scored.brief,
        axes: scored.axes,
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.axes.length === 8)).toBe(true);
    expect(rows.filter((row) => row.directionMatch === 'FAIL')).toHaveLength(0);
    expect(rows.find((row) => row.id === 'juinjip')?.founderOutcome).toBe('PASS');
    expect(rows.find((row) => row.id === 'lmulm')?.founderOutcome).toBe('PASS');
    expect(rows.find((row) => row.id === 'clinicflow')?.t1.verdictId).not.toBe('viable');
    expect(rows.find((row) => row.id === 'clinicflow')?.t1.stageId).not.toBe('S3');
    expect(rows.find((row) => row.id === 'fitbridge')?.t1.verdictId).not.toBe('viable');
    expect(rows.find((row) => row.id === 'fitbridge')?.t1.stageId).not.toBe('S3');
    expect(
      rows.find((row) => row.id === 'clinicflow')?.axes.find((axis) => axis.id === 'rejudgmentHonest')
        ?.score,
    ).not.toBe('FAIL');
    expect(
      rows.find((row) => row.id === 'fitbridge')?.axes.find((axis) => axis.id === 'rejudgmentHonest')
        ?.score,
    ).not.toBe('FAIL');
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });
});
