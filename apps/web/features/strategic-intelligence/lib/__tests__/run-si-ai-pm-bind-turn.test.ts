import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { runSiAiPmBindTurn } from '../run-si-ai-pm-bind-turn';
import { getSiCalibrationCase } from '../si-calibration-cases';

const BIND_SRC = [
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'), 'utf8'),
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'), 'utf8'),
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../run-si-ai-pm-bind-turn.ts'), 'utf8'),
].join('\n');

const VALIDATED_ANSWER =
  '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';
const INTENT_ANSWER = '재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.';

describe('S.I. Phase 3 — AI PM bind', () => {
  it('does not special-case calibration brands or import the question engine', () => {
    expect(BIND_SRC).not.toMatch(
      /주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge|decideNextQuestionFromReview|PR #89/i,
    );
  });

  it('asks an executable validation question, not a copy of Critical Unknown', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const previous = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    const ask = decideSiValidationAsk(previous);
    const question = presentSiAiPmQuestion(ask);

    expect(ask.kind).toBe('repeat_loop');
    expect(ask.criticalUnknown).toMatch(/C2C|재판매/);
    expect(question.questionText).not.toBe(previous.criticalUnknown);
    expect(question.questionText).not.toBe(previous.validationPriority);
    expect(question.questionText).not.toBe(previous.decisionChangingEvidence);
    expect(question.questionText.includes(previous.criticalUnknown)).toBe(false);
    expect(question.questionText).toMatch(/있습니까|알려주세요/);
    expect(question.questionText).toMatch(/재판매|재구매|두 번째/);
    expect(question.source).toBe('si-v1-ai-pm-bind');
  });

  it('routes RIDM to a payer/job ask, not a resale ask', () => {
    const fixture = getSiCalibrationCase('ridm');
    const previous = analyzeStrategicIntelligence({
      title: fixture.title,
      documentText: fixture.documentText,
    });
    const question = presentSiAiPmQuestion(decideSiValidationAsk(previous));
    expect(question.kind).toBe('payer_job');
    expect(question.questionText).toMatch(/돈을 내는|직무|지불/);
    expect(question.questionText).not.toMatch(/재판매/);
  });

  it('closes the loop: SI ask → one AI PM question → VALIDATED answer → Phase 2 re-judgment', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const turn = runSiAiPmBindTurn({
      title: fixture.title,
      documentText: fixture.documentText,
      founderAnswer: VALIDATED_ANSWER,
    });

    expect(turn.source).toBe('si-v1-ai-pm-bind');
    expect(turn.asked.kind).toBe('repeat_loop');
    expect(turn.update.source).toBe('si-v1-update');
    expect(turn.update.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
    expect(turn.update.evidenceStrengthDelta).toBe('up');
    expect(turn.update.criticalUnknownChanged).toBe(true);
    expect(turn.update.judgmentChanged).toBe(true);
    expect(turn.update.validationPriorityChanged).toBe(true);
    expect(turn.previous.stageId).toBe('S3');
    expect(turn.update.next.stageId).toBe('S4');
    expect(turn.previous.criticalUnknown).toMatch(/C2C|재판매/);
    expect(turn.update.next.criticalUnknown).toMatch(/반복 가능/);
    expect(turn.update.next.criticalUnknown).not.toMatch(/반복적으로 발생하는가/);
  });

  it('keeps INTENT answers as CLAIM and does not move the judgment', () => {
    const fixture = getSiCalibrationCase('lmulm');
    const turn = runSiAiPmBindTurn({
      title: fixture.title,
      documentText: fixture.documentText,
      founderAnswer: INTENT_ANSWER,
    });

    expect(turn.update.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(turn.update.next.evidenceMap.every((item) => item.evidenceClass !== 'VALIDATED')).toBe(
      true,
    );
    expect(turn.update.next.stageId).toBe('S3');
    expect(turn.update.criticalUnknownChanged).toBe(false);
    expect(turn.update.judgmentChanged).toBe(false);
    expect(turn.update.next.criticalUnknown).toMatch(/C2C|재판매/);
  });

  it('moves a nameless marketplace through the same bind', () => {
    const documentText = `한정판 굿즈를 실제로 판매했고 1차 판매 매출이 있다.
초기 고객 구매가 존재한다.
자체 앱을 출시했다. 공급망이 있다.
사업 모델은 구매자가 이후 재판매하고 그 거래가 반복되는 것이다.
C2C 재판매가 반복되는지는 확인되지 않았다.`;

    const asked = presentSiAiPmQuestion(
      decideSiValidationAsk(analyzeStrategicIntelligence({ documentText })),
    );
    expect(asked.kind).toBe('repeat_loop');

    const validated = runSiAiPmBindTurn({
      documentText,
      founderAnswer: '최근 구매자 80명 중 20명이 실제 재판매를 등록했고 7건이 거래됐다.',
    });
    expect(validated.update.next.stageId).toBe('S4');
    expect(validated.update.criticalUnknownChanged).toBe(true);

    const intent = runSiAiPmBindTurn({
      documentText,
      founderAnswer: INTENT_ANSWER,
    });
    expect(intent.update.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(intent.update.next.stageId).toBe('S3');
  });
});
