import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidence } from '../classify-founder-evidence';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import {
  appendFounderEvidenceToDocument,
  updateStrategicIntelligence,
} from '../update-strategic-intelligence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-neg-rejudgment-2pass.json',
);

const NEGATIVE_ZERO = '1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.';
const PARTIAL_REPEAT = '재구매 2건은 있었으나 재판매 등록은 0건이다.';
const POSITIVE_REPEAT = pickSiIntegrationAnswer('repeat_loop', 'validated');

const C2C_LAUNCH_DOC = `한정판 문구를 다루는 C2C 재판매 플랫폼이다.
수집 고객이 존재한다.
자체 앱을 출시했다. 공급망과 운영 중이다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.
기존 대안은 범용 중고 거래다.`;

const C2C_SALE_DOC = `한정판 문구를 다루는 C2C 재판매 플랫폼이다.
수집 고객이 존재한다.
한정판을 실제로 판매했고 1차 판매 매출이 있다.
자체 앱을 출시했다. 공급망과 운영 중이다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.
기존 대안은 범용 중고 거래다.`;

function snapJudgment(judgment: ReturnType<typeof analyzeStrategicIntelligence>) {
  return {
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    headline: judgment.judgment,
    strengths: judgment.strengths,
    risks: judgment.risks,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
    validationStatus: judgment.axes.find((axis) => axis.axisId === 'validationStrength')?.status,
    validationSummary: judgment.axes.find((axis) => axis.axisId === 'validationStrength')?.summary,
    conflict: judgment.evidenceMap
      .filter((item) => item.evidenceClass === 'CONFLICT')
      .map((item) => item.text),
    evidence: judgment.evidenceMap.map((item) => ({
      class: item.evidenceClass,
      axis: item.axisId,
      text: item.text,
    })),
  };
}

function play(documentText: string, answer: string, title?: string) {
  const previous = analyzeStrategicIntelligence({ title, documentText });
  const update = updateStrategicIntelligence({
    previous,
    title,
    documentText,
    founderAnswer: answer,
  });
  const journey = resolveSiJourneyIntegration({
    title,
    businessDocument: documentText,
    founderAnswer: answer,
  });
  return {
    classified: classifyFounderEvidence(answer),
    t0: snapJudgment(previous),
    t1: {
      ...snapJudgment(update.next),
      addedClass: update.addedEvidence[0]?.evidenceClass ?? null,
      delta: update.evidenceStrengthDelta,
      questionKind: journey.current.question.kind,
      question: journey.current.question.questionText,
    },
    roseToViable: previous.verdictId !== 'viable' && update.next.verdictId === 'viable',
    viableHeadline: /사업화 가능성이 높음/.test(update.next.judgment),
  };
}

describe('P0 Re-Judgment 2-pass dump', () => {
  it('writes LMULM negative / positive / partial judgment evidence', () => {
    const lmulm = getSiCalibrationCase('lmulm');
    const payload = {
      head: 'c0b9bc3',
      production: '0638f77',
      answerNegative: NEGATIVE_ZERO,
      classifiedNegative: classifyFounderEvidence(NEGATIVE_ZERO),
      lmulmNegative: play(lmulm.documentText, NEGATIVE_ZERO, lmulm.title),
      founderPathNegative: play(C2C_LAUNCH_DOC, NEGATIVE_ZERO),
      salePathPositive: play(C2C_SALE_DOC, POSITIVE_REPEAT),
      founderPathPartial: play(C2C_LAUNCH_DOC, PARTIAL_REPEAT),
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(payload.lmulmNegative.roseToViable).toBe(false);
    expect(payload.founderPathNegative.roseToViable).toBe(false);
    expect(payload.lmulmNegative.viableHeadline).toBe(false);
    expect(payload.founderPathNegative.viableHeadline).toBe(false);
    expect(payload.salePathPositive.t1.verdictId).toBe('viable');
    expect(payload.salePathPositive.t1.stageId).toBe('S4');
    expect(payload.founderPathPartial.t1.verdictId).not.toBe('viable');
    expect(payload.founderPathPartial.t1.stageId).not.toBe('S4');
  });
});
