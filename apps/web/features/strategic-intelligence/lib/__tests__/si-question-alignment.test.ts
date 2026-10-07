import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import {
  GENERIC_PAID_QUESTION,
  scoreSiQuestionAlignment,
} from './score-si-question-alignment';
import {
  E2E_GATE_CASES,
  answerFitsValidationAsk,
  secondTurnAnswerForCase,
} from './si-founder-journey-e2e-fixtures';

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-question-alignment.json',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);
const SCORER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-question-alignment.ts'),
  'utf8',
);

function secondAnswerFor(id: (typeof CASE_IDS)[number], kind: string): string {
  if ((E2E_GATE_CASES as readonly string[]).includes(id)) {
    return secondTurnAnswerForCase(id as (typeof E2E_GATE_CASES)[number]);
  }
  if (kind === 'payer_split') {
    return '양조장 대표 1명이 마케팅비 견적을 수락하고 선결제했다.';
  }
  if (kind === 'payer_job') {
    return '결제자 1명이 두 번째 달에도 구독을 결제했고 같은 직무를 이 제품으로 대체했다.';
  }
  return pickSiIntegrationAnswer(kind as Parameters<typeof pickSiIntegrationAnswer>[0], 'validated');
}

function runAlignment(id: (typeof CASE_IDS)[number]) {
  const fixture = getSiCalibrationCase(id);
  const t0 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
  });
  const answer1 = pickSiIntegrationAnswer(t0.firstQuestion.kind, 'validated');
  const t1 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
    founderAnswer: answer1,
  });
  const documentAfter1 = appendFounderEvidenceToDocument(fixture.documentText, answer1);
  const t1Ask = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: documentAfter1,
  });
  const answer2 = secondAnswerFor(id, t1Ask.firstQuestion.kind);
  const t2 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: documentAfter1,
    founderAnswer: answer2,
  });

  const answerEnteredEvidence =
    t1.current.update?.source === 'si-v1-update' &&
    t1.current.update.addedEvidence[0]?.evidenceClass === 'VALIDATED' &&
    t1.current.update.addedEvidence[0]?.text === answer1;

  const twoTurnHeld =
    t1.current.update?.source === 'si-v1-update' &&
    t2.current.update?.source === 'si-v1-update' &&
    (t1.current.update.addedEvidence[0]?.evidenceClass === 'VALIDATED') &&
    (t2.current.update.addedEvidence[0]?.evidenceClass === 'VALIDATED') &&
    t2.current.judgment.evidenceMap.length > t0.firstJudgment.evidenceMap.length;

  const scored = scoreSiQuestionAlignment({
    judgment: t0.firstJudgment,
    question: t0.firstQuestion,
    answerEnteredEvidence,
    twoTurnHeld,
  });

  return { fixture, t0, t1, t1Ask, t2, answer1, answer2, scored };
}

describe('S.I. Question Alignment Gate', () => {
  it('does not special-case brands or import the question engine', () => {
    expect(PRESENTER_SRC).toContain(GENERIC_PAID_QUESTION);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(`${PRESENTER_SRC}\n${ASK_SRC}\n${SCORER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(ASK_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it.each(CASE_IDS)('%s: records Priority, question, DCE, and evidence loop', (id) => {
    const { t0, scored, answer1 } = runAlignment(id);
    expect(t0.firstJudgment.validationPriority.length).toBeGreaterThan(8);
    expect(t0.firstJudgment.decisionChangingEvidence.length).toBeGreaterThan(8);
    expect(t0.firstQuestion.questionText.length).toBeGreaterThan(8);
    expect(t0.firstQuestion.questionText).not.toBe(t0.firstJudgment.criticalUnknown);
    expect(scored.axes).toHaveLength(6);
    expect(answer1.length).toBeGreaterThan(8);
  });

  it('keeps the PR #98 two-turn loop on LMULM / 클리닉 / 핏브릿지', () => {
    for (const id of E2E_GATE_CASES) {
      const { t0, t1Ask, t2, answer2, scored } = runAlignment(id);
      expect(scored.axes.find((axis) => axis.id === 'twoTurnLoop')?.score).toBe('PASS');
      expect(
        answerFitsValidationAsk({
          caseId: id,
          kind: t1Ask.firstQuestion.kind,
          answer: answer2,
        }),
      ).toBe(true);
      expect(t2.current.update?.source).toBe('si-v1-update');
      expect(t0.firstQuestion.questionText).not.toBe(t0.firstJudgment.criticalUnknown);
      if (id !== 'lmulm') {
        expect(t0.firstQuestion.questionText).not.toMatch(/재판매/);
        expect(t1Ask.firstQuestion.questionText).not.toMatch(/재판매/);
        expect(t1Ask.firstQuestion.questionText).toMatch(/no-show|노쇼|반품|전후/);
      }
    }
  });

  it('writes the five-business question alignment dump', () => {
    const rows = CASE_IDS.map((id) => {
      const { t0, t1, t1Ask, t2, answer1, answer2, scored } = runAlignment(id);
      return {
        id,
        kind: t0.firstQuestion.kind,
        validationPriority: t0.firstJudgment.validationPriority,
        decisionChangingEvidence: t0.firstJudgment.decisionChangingEvidence,
        criticalUnknown: t0.firstJudgment.criticalUnknown,
        question: t0.firstQuestion.questionText,
        whyAsking: t0.firstQuestion.whyAsking,
        evidenceSought: t0.firstQuestion.evidenceSought,
        specializedStakes: scored.stakes,
        isGenericPaidQuestion: t0.firstQuestion.questionText.includes(GENERIC_PAID_QUESTION),
        answer1,
        answer2,
        answerEnteredEvidence: t1.current.update?.addedEvidence[0]?.text === answer1,
        t1Moved:
          t1.current.judgment.criticalUnknown !== t0.firstJudgment.criticalUnknown ||
          t1.current.judgment.validationPriority !== t0.firstJudgment.validationPriority,
        t2Question: t1Ask.firstQuestion.questionText,
        t2EvidenceCount: t2.current.judgment.evidenceMap.length,
        axes: scored.axes,
        overall: scored.overall,
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(PRESENTER_SRC).toContain(GENERIC_PAID_QUESTION);
    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.axes.length === 6)).toBe(true);
    expect(rows.every((row) => row.answerEnteredEvidence)).toBe(true);
    expect(rows.filter((row) => row.overall === 'FAIL')).toHaveLength(0);
    expect(rows.find((row) => row.id === 'lmulm')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'juinjip')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'ridm')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'clinicflow')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'fitbridge')?.overall).toBe('PASS');
    expect(rows.find((row) => row.id === 'clinicflow')?.isGenericPaidQuestion).toBe(false);
    expect(rows.find((row) => row.id === 'fitbridge')?.isGenericPaidQuestion).toBe(false);
    expect(rows.find((row) => row.id === 'clinicflow')?.t2Question).not.toMatch(/재판매/);
    expect(rows.find((row) => row.id === 'fitbridge')?.t2Question).not.toMatch(/재판매/);
  });
});
