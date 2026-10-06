import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  classifyStaleCuVerdict,
  detectStaleSurfaces,
  isPromotedJudgment,
} from './stale-cu-definition';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-promotion-gate.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const UPDATE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../update-strategic-intelligence.ts'),
  'utf8',
);

const LOCKED_QUESTIONS = {
  juinjip:
    '쓰는 사람과 돈을 내는 사람이 같습니까? 결제자 한 명이 이 문제를 비용으로 해결할 이유가 있다면 그 이유를 알려주세요. 아직 확인 전이면 모른다고 답해도 됩니다.',
  lmulm:
    '최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.',
  ridm:
    '이 제품을 쓰며 돈을 내는 사람은 누구이고, 그 사람이 어떤 일을 이 제품으로 대신합니까? 실제 지불이 있으면 그 사람과 이유를 한 쌍으로 알려주세요. 아직이면 가설이라고 답해도 됩니다.',
} as const;

const PAYMENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'validated');
const NAMELESS = `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;

function askFor(documentText: string, title?: string) {
  return presentSiAiPmQuestion(
    decideSiValidationAsk(analyzeStrategicIntelligence({ title, documentText })),
  );
}

function runLoop(id: (typeof CASE_IDS)[number]) {
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
  return { fixture, t0, t1, answer };
}

describe('S.I. DCE Reconciliation Promotion Gate — measure only', () => {
  it('does not add a persist SoT, brand branch, or question-engine import', () => {
    const runtime = `${ANALYZER_SRC}\n${PRESENTER_SRC}\n${UPDATE_SRC}`;
    expect(runtime).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(runtime).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(UPDATE_SRC).toMatch(/source: 'si-v1-update'/);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
  });

  it.each(Object.keys(LOCKED_QUESTIONS) as Array<keyof typeof LOCKED_QUESTIONS>)(
    '%s spoken question stays locked on the #107 baseline',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      expect(askFor(fixture.documentText, fixture.title).questionText).toBe(LOCKED_QUESTIONS[id]);
    },
  );

  it('locks DCE 0/2 1/2 2/2 and 2/2+extra on a nameless quantified problem', () => {
    const t0 = analyzeStrategicIntelligence({ documentText: NAMELESS });
    const one = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(NAMELESS, PAYMENT_ONLY),
    });
    const twoDoc = appendFounderEvidenceToDocument(
      NAMELESS,
      '결제 후보 2명이 월 구독을 결제했고 no-show가 18%에서 9%로 줄었다.',
    );
    const two = resolveSiJourneyIntegration({
      businessDocument: NAMELESS,
      founderAnswer: '결제 후보 2명이 월 구독을 결제했고 no-show가 18%에서 9%로 줄었다.',
    });
    const extra = resolveSiJourneyIntegration({
      businessDocument: twoDoc,
      founderAnswer: '같은 유료 고객 2건이 다음 달에도 월 구독을 결제했다.',
    });

    expect(t0.verdictId).toBe('judgment_deferred');
    expect(t0.stageId).not.toBe('S3');
    expect(one.verdictId).toBe('judgment_deferred');
    expect(one.stageId).not.toBe('S3');
    expect(one.criticalUnknown).toMatch(/지불만|줄었는가/);

    expect(two.current.judgment.stageId).toBe('S3');
    expect(isPromotedJudgment(two.current.judgment)).toBe(true);
    const twoStale = detectStaleSurfaces({
      criticalUnknown: two.current.judgment.criticalUnknown,
      decisionChangingEvidence: two.current.judgment.decisionChangingEvidence,
      validationPriority: two.current.judgment.validationPriority,
      nextQuestion: two.current.question.questionText,
    });
    expect(classifyStaleCuVerdict({ fill: 'dce_2_2', promoted: true, stale: twoStale })).toBe('PASS');
    expect(two.current.question.questionText).not.toMatch(/전후 수치|얼마나 줄였|재판매/);

    const extraStale = detectStaleSurfaces({
      criticalUnknown: extra.current.judgment.criticalUnknown,
      decisionChangingEvidence: extra.current.judgment.decisionChangingEvidence,
      validationPriority: extra.current.judgment.validationPriority,
      nextQuestion: extra.current.question.questionText,
    });
    expect(classifyStaleCuVerdict({ fill: 'dce_2_2_extra', promoted: true, stale: extraStale })).toBe(
      'PASS',
    );
    expect(extra.current.question.questionText).not.toMatch(/전후 수치|얼마나 줄였|재판매/);
  });

  it('records the five-business Founder Journey loop without opening Production', () => {
    const rows = CASE_IDS.map((id) => {
      const { t0, t1, answer } = runLoop(id);
      const evidence = t1.current.update?.addedEvidence[0];
      return {
        id,
        t0: {
          verdictId: t0.firstJudgment.verdictId,
          stageId: t0.firstJudgment.stageId,
          criticalUnknown: t0.firstJudgment.criticalUnknown,
          validationPriority: t0.firstJudgment.validationPriority,
          question: t0.firstQuestion.questionText,
          kind: t0.firstQuestion.kind,
        },
        answer,
        t1: {
          verdictId: t1.current.judgment.verdictId,
          stageId: t1.current.judgment.stageId,
          criticalUnknown: t1.current.judgment.criticalUnknown,
          validationPriority: t1.current.judgment.validationPriority,
          question: t1.current.question.questionText,
          kind: t1.current.question.kind,
          evidenceClass: evidence?.evidenceClass ?? null,
          source: t1.current.update?.source ?? null,
          judgmentChanged: t1.current.update?.judgmentChanged ?? false,
        },
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.t1.source === 'si-v1-update')).toBe(true);
    expect(rows.every((row) => row.t1.evidenceClass === 'VALIDATED')).toBe(true);
    expect(rows.find((row) => row.id === 'juinjip')?.t0.question).toBe(LOCKED_QUESTIONS.juinjip);
    expect(rows.find((row) => row.id === 'lmulm')?.t1.stageId).toBe('S4');
    expect(rows.find((row) => row.id === 'clinicflow')?.t1.stageId).not.toBe('S3');
    expect(rows.find((row) => row.id === 'fitbridge')?.t1.stageId).not.toBe('S3');
    expect(rows.find((row) => row.id === 'clinicflow')?.t1.question).not.toMatch(/재판매/);
    expect(rows.find((row) => row.id === 'fitbridge')?.t1.question).not.toMatch(/재판매/);
  });
});
