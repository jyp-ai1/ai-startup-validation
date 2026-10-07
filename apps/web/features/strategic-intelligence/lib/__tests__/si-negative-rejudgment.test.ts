import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const UPDATE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../update-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const NEGATIVE_ZERO =
  '1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.';
const PARTIAL_REPEAT =
  '재구매 2건은 있었으나 재판매 등록은 0건이다.';
const POSITIVE_REPEAT = pickSiIntegrationAnswer('repeat_loop', 'validated');

/** Launch + C2C thesis, no own-revenue line — Founder Test path without a brand name. */
const C2C_LAUNCH_DOC = `한정판 문구를 다루는 C2C 재판매 플랫폼이다.
수집 고객이 존재한다.
자체 앱을 출시했다. 공급망과 운영 중이다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.
기존 대안은 범용 중고 거래다.`;

/** Same axis with 1차 판매 already present — existing positive promotion path. */
const C2C_SALE_DOC = `한정판 문구를 다루는 C2C 재판매 플랫폼이다.
수집 고객이 존재한다.
한정판을 실제로 판매했고 1차 판매 매출이 있다.
자체 앱을 출시했다. 공급망과 운영 중이다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.
기존 대안은 범용 중고 거래다.`;

function evidenceOf(documentText: string, title?: string) {
  return analyzeStrategicIntelligence({ title, documentText });
}

function afterAnswer(documentText: string, answer: string, title?: string) {
  const previous = analyzeStrategicIntelligence({ title, documentText });
  const update = updateStrategicIntelligence({
    previous,
    title,
    documentText,
    founderAnswer: answer,
  });
  return { previous, update, next: update.next };
}

describe('P0 Negative Evidence → Re-Judgment Integrity', () => {
  it('does not brand-branch or rewrite the presenter / question engine', () => {
    expect(`${ANALYZER_SRC}\n${UPDATE_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function repeatMeasuredUnproven/);
    expect(ANALYZER_SRC).toMatch(/repeat_zero/);
    expect(UPDATE_SRC).toMatch(/function reconcileEvidenceStrengthDelta/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('classifies the mixed sale + zero-repeat line without ASSUMPTION promotion or CONFLICT', () => {
    const classified = classifyFounderEvidence(NEGATIVE_ZERO);
    expect(classified.evidenceClass).toBe('FACT');
    expect(classified.axisId).toBe('validationStrength');

    const next = evidenceOf(appendFounderEvidenceToDocument(C2C_LAUNCH_DOC, NEGATIVE_ZERO));
    const zeroFacts = next.evidenceMap.filter(
      (item) => item.evidenceClass === 'FACT' && /(재구매|재판매).{0,12}0/.test(item.text),
    );
    const saleFacts = next.evidenceMap.filter(
      (item) => item.evidenceClass === 'FACT' && /1차.{0,10}판매|판매|매출/.test(item.text),
    );
    expect(zeroFacts.length).toBeGreaterThan(0);
    expect(saleFacts.length).toBeGreaterThan(0);
    expect(next.evidenceMap.some((item) => item.evidenceClass === 'CONFLICT')).toBe(false);
    expect(
      next.evidenceMap.some(
        (item) =>
          item.evidenceClass === 'ASSUMPTION' && /(재구매|재판매).{0,12}0/.test(item.text),
      ),
    ).toBe(false);
  });

  it('A. Positive — quantified resale still promotes to S4 / viable and closes the C2C CU', () => {
    const { previous, update, next } = afterAnswer(C2C_SALE_DOC, POSITIVE_REPEAT);
    expect(previous.stageId).not.toBe('S4');
    expect(previous.criticalUnknown).toMatch(/C2C|재판매|반복/);
    expect(update.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(update.evidenceStrengthDelta).toBe('up');
    expect(next.stageId).toBe('S4');
    expect(next.verdictId).toBe('viable');
    expect(next.judgment).toMatch(/사업화 가능성이 높음/);
    expect(next.criticalUnknown).not.toMatch(/반복적으로 발생하는가/);
    expect(next.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED')).toBe(true);
  });

  it('B. Negative — measured 0 keeps 1차 판매, blocks viable, keeps C2C CU open, forbids S4', () => {
    const { previous, update, next } = afterAnswer(C2C_LAUNCH_DOC, NEGATIVE_ZERO);
    expect(previous.verdictId).not.toBe('viable');
    expect(previous.stageId).not.toBe('S4');
    expect(update.addedEvidence[0]?.evidenceClass).toBe('FACT');
    expect(update.addedEvidence[0]?.evidenceClass).not.toBe('CONFLICT');
    expect(update.evidenceStrengthDelta).not.toBe('up');
    expect(next.verdictId).toBe('conditionally_viable');
    expect(next.verdictId).not.toBe('viable');
    expect(next.stageId).toBe('S3');
    expect(next.stageId).not.toBe('S4');
    expect(next.judgment).toMatch(/조건부 사업화 가능/);
    expect(next.judgment).not.toMatch(/사업화 가능성이 높음/);
    expect(next.criticalUnknown).toMatch(/C2C|재판매|반복/);
    expect(next.decisionChangingEvidence).toMatch(/없으면 1차 판매 브랜드로 내린다/);
    expect(next.strengths.join(' ')).toMatch(/판매|매출/);
    expect(next.risks.join(' ')).toMatch(/0건|반복/);
    expect(next.axes.find((axis) => axis.axisId === 'validationStrength')?.status).not.toBe(
      'supported',
    );
    expect(next.evidenceMap.some((item) => /반복 사업이 검증됐다는 뜻은 아니다/.test(item.text))).toBe(
      true,
    );
  });

  it('B. Negative on an already-viable C2C document downgrades headline without deleting the sale FACT', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const { previous, update, next } = afterAnswer(
      fixture.documentText,
      NEGATIVE_ZERO,
      fixture.title,
    );
    expect(previous.verdictId).toBe('viable');
    expect(previous.stageId).toBe('S3');
    expect(update.evidenceStrengthDelta).toBe('down');
    expect(next.verdictId).toBe('conditionally_viable');
    expect(next.stageId).toBe('S3');
    expect(next.judgment).not.toMatch(/사업화 가능성이 높음/);
    expect(next.criticalUnknown).toMatch(/C2C|재판매|반복/);
    expect(next.strengths.join(' ')).toMatch(/판매|매출/);
    expect(next.evidenceMap.some((item) => item.evidenceClass === 'CONFLICT')).toBe(false);
  });

  it('C. Partial — some repurchase plus resale-zero is not full DCE and must not become S4/viable', () => {
    const { update, next } = afterAnswer(C2C_LAUNCH_DOC, PARTIAL_REPEAT);
    expect(update.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');
    expect(update.addedEvidence[0]?.evidenceClass).not.toBe('CONFLICT');
    expect(next.stageId).not.toBe('S4');
    expect(next.verdictId).not.toBe('viable');
    expect(next.judgment).not.toMatch(/사업화 가능성이 높음/);
    expect(next.criticalUnknown).toMatch(/C2C|재판매|반복/);
    expect(next.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
  });

  it('keeps the C2C CU open in the journey bind after measured zero', () => {
    const view = resolveSiJourneyIntegration({
      businessDocument: C2C_LAUNCH_DOC,
      founderAnswer: NEGATIVE_ZERO,
    });
    expect(view.current.update?.addedEvidence[0]?.evidenceClass).toBe('FACT');
    expect(view.current.judgment.verdictId).toBe('conditionally_viable');
    expect(view.current.judgment.stageId).toBe('S3');
    expect(view.current.judgment.criticalUnknown).toMatch(/C2C|재판매|반복/);
    expect(view.current.question.kind).toBe('repeat_loop');
    expect(view.current.question.questionText).toMatch(/재판매|재구매/);
  });
});
