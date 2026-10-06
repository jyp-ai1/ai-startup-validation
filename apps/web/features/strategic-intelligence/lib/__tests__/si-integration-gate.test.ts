import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import {
  resolveSiJourneyIntegration,
  siIgnoresGapLoopDocument,
} from '../resolve-si-journey-integration';

const GATE_SRC = [
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../resolve-si-journey-integration.ts'),
    'utf8',
  ),
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../si-integration-answers.ts'),
    'utf8',
  ),
].join('\n');

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;

describe('S.I. Integration Gate', () => {
  it('does not special-case brands or import the question engine', () => {
    expect(GATE_SRC).not.toMatch(
      /주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge|decideNextQuestionFromReview/i,
    );
  });

  it.each(CASE_IDS)(
    '%s: SI judgment and Decision Evidence ask come before the founder answer',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      const journey = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
      });
      const ask = decideSiValidationAsk(journey.firstJudgment);

      expect(journey.firstJudgment.judgment.length).toBeGreaterThan(8);
      expect(journey.firstQuestion.questionText).not.toBe(journey.firstJudgment.criticalUnknown);
      expect(journey.firstQuestion.questionText.includes(journey.firstJudgment.criticalUnknown)).toBe(
        false,
      );
      expect(journey.firstQuestion.evidenceSought).toBe(
        journey.firstJudgment.decisionChangingEvidence,
      );
      expect(journey.firstQuestion.kind).toBe(ask.kind);
      expect(journey.firstQuestion.questionText).toMatch(/습니까|알려주세요/);
    },
  );

  it.each(CASE_IDS)('%s: VALIDATED answer enters evidence and recomputes S.I.', (id) => {
    const fixture = getSiCalibrationCase(id);
    const first = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: fixture.documentText,
    });
    const answer = pickSiIntegrationAnswer(first.firstQuestion.kind, 'validated');
    const next = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: fixture.documentText,
      founderAnswer: answer,
    });

    expect(next.current.update).not.toBeNull();
    expect(next.current.update?.addedEvidence[0]?.text).toBe(answer);
    expect(next.current.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(next.current.update?.source).toBe('si-v1-update');
    expect(next.current.judgment.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED')).toBe(
      true,
    );
    expect(
      next.current.update?.judgmentChanged ||
        next.current.update?.criticalUnknownChanged ||
        next.current.update?.validationPriorityChanged ||
        next.current.judgment.stageId !== first.firstJudgment.stageId,
    ).toBe(true);
  });

  it.each(CASE_IDS)('%s: INTENT holds CLAIM and keeps the unknown', (id) => {
    const fixture = getSiCalibrationCase(id);
    const first = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: fixture.documentText,
    });
    const answer = pickSiIntegrationAnswer(first.firstQuestion.kind, 'intent');
    const next = resolveSiJourneyIntegration({
      title: fixture.title,
      businessDocument: fixture.documentText,
      founderAnswer: answer,
    });

    expect(next.current.update?.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(next.current.judgment.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(
      true,
    );
    expect(next.current.judgment.stageId).toBe(first.firstJudgment.stageId);
    expect(next.current.judgment.verdictId).toBe(first.firstJudgment.verdictId);
    expect(next.current.judgment.criticalUnknown).toBe(first.firstJudgment.criticalUnknown);
    expect(next.current.judgment.validationPriority).toBe(first.firstJudgment.validationPriority);
  });

  it.each(CASE_IDS)('%s: gap-loop document rewrite cannot overwrite S.I.', (id) => {
    const fixture = getSiCalibrationCase(id);
    const gapLoopDocument = `${fixture.documentText}\n\n[Gap loop rewrite]\n사용자는 관광객이다. 결제자는 확인됐다. 직무는 정의됐다.`;
    expect(
      siIgnoresGapLoopDocument({
        title: fixture.title,
        businessDocument: fixture.documentText,
        gapLoopDocument,
        founderAnswer: pickSiIntegrationAnswer(
          resolveSiJourneyIntegration({
            title: fixture.title,
            businessDocument: fixture.documentText,
          }).firstQuestion.kind,
          'validated',
        ),
      }),
    ).toBe(true);
  });
});
