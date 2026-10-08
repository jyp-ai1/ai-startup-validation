import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { scoreConversationTurn } from './score-si-conversation-quality';

const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const HELPER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../next-period-outcome.ts'),
  'utf8',
);
const CLASSIFY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../classify-founder-evidence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const OMISSION = `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const RETURNS = `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const RESALE = `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`;

const SAAS = `감정 기록 AI 컴패니언이다.
수익 모델은 월 구독이다.
아직 유료 고객과 결제자는 확인되지 않았다.`;

const TOURISM = `영세 양조장의 온라인 마케팅을 연결한다.
타깃은 관광객과 FIT다.
아직 앱은 출시되지 않았고 매출은 없다.`;

const PAYMENT_ONLY = '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.';
const FULL_OMISSION = '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.';
const FULL_RETURNS = '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.';
const HELD_OMISSION =
  '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.';
const HELD_RETURNS =
  '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.';
const PLAN_NEXT = '다음 기간 성과를 측정할 예정이다.';

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

function viewOf(document: string, answer?: string) {
  return resolveSiJourneyIntegration({
    title: 'conversation-quality',
    businessDocument: document,
    founderAnswer: answer,
  });
}

describe('Accuracy Batch — conversation quality', () => {
  it('does not brand-branch, rewrite judgment architecture, or leak Gap Loop IDs', () => {
    expect(`${ANALYZER_SRC}\n${HELPER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/from ['"]\.\/next-period-outcome['"]/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
  });

  it('keeps t0 judgment, CU, DCE, and the spoken question readable', () => {
    for (const document of [OMISSION, RETURNS, RESALE, SAAS, TOURISM]) {
      const view = viewOf(document);
      const scored = scoreConversationTurn({
        judgment: view.firstJudgment,
        question: view.firstQuestion,
      });
      expect(scored.overall, document.slice(0, 24)).not.toBe('FAIL');
      expect(
        leak(
          `${view.firstJudgment.judgment}\n${view.firstJudgment.criticalUnknown}\n${view.firstQuestion.questionText}`,
        ),
      ).toBe(false);
    }
  });

  it('does not promote a payment-only or planned next-period answer', () => {
    const paid = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(OMISSION, PAYMENT_ONLY),
    });
    expect(paid.verdictId).toBe('judgment_deferred');
    expect(paid.stageId).not.toBe('S3');
    expect(paid.criticalUnknown).toMatch(/지불만|줄었는가/);

    const planned = viewOf(OMISSION, PLAN_NEXT);
    expect(classifyFounderEvidenceClass(PLAN_NEXT)).toBe('CLAIM');
    expect(planned.current.update?.addedEvidence[0]?.evidenceClass).toBe('CLAIM');
    expect(planned.current.update?.addedEvidence[0]?.evidenceClass).not.toBe('VALIDATED');
    expect(planned.current.judgment.stageId).not.toBe('S3');
  });

  it('after 2/2, CU moves to next period and a held answer retires that CU', () => {
    const full = viewOf(OMISSION, FULL_OMISSION);
    expect(full.current.judgment.stageId).toBe('S3');
    expect(full.current.judgment.criticalUnknown).toMatch(/다음 고객|다음 기간/);
    const fullScore = scoreConversationTurn({
      judgment: full.current.judgment,
      question: full.current.question,
    });
    expect(fullScore.axes.find((axis) => axis.id === 'questionVerifiesCu')?.score).toBe('PASS');

    const held = viewOf(
      appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION),
      HELD_OMISSION,
    );
    expect(held.current.judgment.stageId).toBe('S3');
    expect(held.current.judgment.verdictId).not.toBe('judgment_deferred');
    expect(held.current.judgment.criticalUnknown).not.toMatch(
      /다음 고객이나 다음 기간에도 같은 방향/,
    );
    expect(held.current.judgment.criticalUnknown).toMatch(/반복 가능/);
    expect(held.current.update?.criticalUnknownChanged).toBe(true);
    expect(classifyFounderEvidenceClass(HELD_OMISSION)).not.toBe('VALIDATED');
    expect(held.current.question.questionText).not.toMatch(/전후 수치|얼마나 줄였/);
    expect(leak(`${held.current.judgment.criticalUnknown}\n${held.current.question.questionText}`)).toBe(
      false,
    );

    const heldReturns = viewOf(
      appendFounderEvidenceToDocument(RETURNS, FULL_RETURNS),
      HELD_RETURNS,
    );
    expect(heldReturns.current.judgment.criticalUnknown).not.toMatch(
      /다음 고객이나 다음 기간에도 같은 방향/,
    );
    expect(heldReturns.current.judgment.stageId).toBe('S3');
  });
});
