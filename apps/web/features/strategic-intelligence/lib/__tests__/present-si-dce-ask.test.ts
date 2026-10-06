import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { decideSiValidationAsk } from '../decide-si-validation-ask';
import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { GENERIC_PAID_QUESTION } from './score-si-question-alignment';

const LOCKED_QUESTIONS = {
  juinjip:
    '쓰는 사람과 돈을 내는 사람이 같습니까? 결제자 한 명이 이 문제를 비용으로 해결할 이유가 있다면 그 이유를 알려주세요. 아직 확인 전이면 모른다고 답해도 됩니다.',
  lmulm:
    '최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.',
  ridm:
    '이 제품을 쓰며 돈을 내는 사람은 누구이고, 그 사람이 어떤 일을 이 제품으로 대신합니까? 실제 지불이 있으면 그 사람과 이유를 한 쌍으로 알려주세요. 아직이면 가설이라고 답해도 됩니다.',
} as const;

const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);

function askFor(documentText: string, title?: string) {
  const judgment = analyzeStrategicIntelligence({ title, documentText });
  return presentSiAiPmQuestion(decideSiValidationAsk(judgment));
}

describe('AI PM question follows S.I. DCE — no brand branches', () => {
  it('does not special-case calibration brands or import the question engine', () => {
    expect(`${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).toContain(GENERIC_PAID_QUESTION);
  });

  it.each(Object.keys(LOCKED_QUESTIONS) as Array<keyof typeof LOCKED_QUESTIONS>)(
    '%s spoken question stays locked',
    (id) => {
      const fixture = getSiCalibrationCase(id);
      const question = askFor(fixture.documentText, fixture.title);
      expect(question.questionText).toBe(LOCKED_QUESTIONS[id]);
    },
  );

  it('binds a nameless no-show metric and named system into the paid ask', () => {
    const question = askFor(`5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`);
    expect(question.kind).toBe('paid_conversion');
    expect(question.questionText).toMatch(/no-show|노쇼/);
    expect(question.questionText).toMatch(/EMR/);
    expect(question.questionText).toMatch(/전후|줄였/);
    expect(question.questionText).not.toContain(GENERIC_PAID_QUESTION);
    expect(question.questionText).not.toMatch(/재판매/);
  });

  it('binds a nameless return-rate metric and Latin alternative into the paid ask', () => {
    const question = askFor(`D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`);
    expect(question.kind).toBe('paid_conversion');
    expect(question.questionText).toMatch(/반품/);
    expect(question.questionText).toMatch(/True Fit/);
    expect(question.questionText).not.toContain(GENERIC_PAID_QUESTION);
    expect(question.questionText).not.toMatch(/재판매/);
  });

  it('keeps the generic paid ask when the problem is not quantified', () => {
    const question = askFor(`병의원은 예약 관리가 어렵습니다.
기존 대안은 전화와 수기 장부입니다.
아직 출시되지 않았고 매출은 없습니다.`);
    expect(question.questionText).toContain(GENERIC_PAID_QUESTION);
  });
});
