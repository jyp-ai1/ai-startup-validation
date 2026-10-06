import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-integration-gate.json',
);

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;

describe('S.I. Integration Gate dump', () => {
  it('writes the five-business journey loop', () => {
    const rows = CASE_IDS.map((id) => {
      const fixture = getSiCalibrationCase(id);
      const first = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
      });
      const validatedAnswer = pickSiIntegrationAnswer(first.firstQuestion.kind, 'validated');
      const intentAnswer = pickSiIntegrationAnswer(first.firstQuestion.kind, 'intent');
      const validated = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
        founderAnswer: validatedAnswer,
        gapLoopDocument: `${fixture.documentText}\n[Gap loop rewrite]`,
      });
      const intent = resolveSiJourneyIntegration({
        title: fixture.title,
        businessDocument: fixture.documentText,
        founderAnswer: intentAnswer,
        gapLoopDocument: `${fixture.documentText}\n[Gap loop rewrite]`,
      });
      return {
        id,
        acceptances: {
          judgmentBeforeQuestion: Boolean(first.firstJudgment.judgment),
          questionVerifiesDecisionEvidence:
            first.firstQuestion.evidenceSought === first.firstJudgment.decisionChangingEvidence &&
            first.firstQuestion.questionText !== first.firstJudgment.criticalUnknown,
          answerEntersEvidence: validated.current.update?.addedEvidence[0]?.text === validatedAnswer,
          evidenceUpdatesJudgment: Boolean(
            validated.current.update?.judgmentChanged ||
              validated.current.update?.criticalUnknownChanged ||
              validated.current.update?.validationPriorityChanged,
          ),
          intentHoldsUnknown:
            intent.current.judgment.criticalUnknown === first.firstJudgment.criticalUnknown &&
            intent.current.update?.addedEvidence[0]?.evidenceClass === 'CLAIM',
          gapLoopDoesNotOverwrite: validated.usedBusinessDocument && validated.ignoredGapLoopDocument,
        },
        first: {
          verdictId: first.firstJudgment.verdictId,
          stageId: first.firstJudgment.stageId,
          criticalUnknown: first.firstJudgment.criticalUnknown,
          validationPriority: first.firstJudgment.validationPriority,
          questionKind: first.firstQuestion.kind,
          questionText: first.firstQuestion.questionText,
        },
        validated: {
          founderAnswer: validatedAnswer,
          addedEvidenceClass: validated.current.update?.addedEvidence[0]?.evidenceClass,
          stageId: validated.current.judgment.stageId,
          criticalUnknown: validated.current.judgment.criticalUnknown,
          validationPriority: validated.current.judgment.validationPriority,
          deltas: {
            evidenceStrengthDelta: validated.current.update?.evidenceStrengthDelta,
            criticalUnknownChanged: validated.current.update?.criticalUnknownChanged,
            judgmentChanged: validated.current.update?.judgmentChanged,
            validationPriorityChanged: validated.current.update?.validationPriorityChanged,
          },
        },
        intent: {
          founderAnswer: intentAnswer,
          addedEvidenceClass: intent.current.update?.addedEvidence[0]?.evidenceClass,
          stageId: intent.current.judgment.stageId,
          criticalUnknown: intent.current.judgment.criticalUnknown,
        },
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => Object.values(row.acceptances).every(Boolean))).toBe(true);
  });
});
