import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-question-alignment-p1a.json',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const BIND_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../run-si-ai-pm-bind-turn.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const SOURCE_PREFIX = 'origin/cursor/si-founder-test-e648:docs/evidence/ALABOM/SI/founder-test-sources';

const PAID = '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.';
const GENERIC_REPEAT_ASK = {
  kind: 'repeat_loop' as const,
  criticalUnknown:
    '현재 강점이 반복 가능한 사업으로 이어지는가. 1회 성과가 반복되지 않으면 사업화 판단을 유지할 수 없다.',
  decisionChangingEvidence:
    '반복 구매·재사용 또는 이탈 없는 두 번째 거래 데이터. 이 데이터가 있으면 판단을 유지·상향하고, 없으면 1회성으로 내린다.',
  validationPriority: '이미 구매한 고객의 두 번째 행동을 확인한다.',
  source: 'si-v1' as const,
};

function sourceOf(name: string): string {
  return execSync(`git show ${SOURCE_PREFIX}/${name}-source.txt`, {
    encoding: 'utf8',
    cwd: resolve(process.cwd(), '../..'),
  });
}

function afterPaid(title: string | undefined, document: string) {
  return resolveSiJourneyIntegration({
    title,
    businessDocument: document,
    founderAnswer: PAID,
  }).current;
}

describe('Question Alignment P1-A — repeat_loop binds CU/DCE axis', () => {
  it('does not brand-branch, rewrite the analyzer, or change ask kind detection', () => {
    expect(`${PRESENTER_SRC}\n${BIND_SRC}\n${ASK_SRC}\n${ANALYZER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(PRESENTER_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('Pattern A: C2C triad keeps 재판매; 구독 document asks 재결제; 관광/양조장 document asks 계약·수요', () => {
    const resale = presentSiAiPmQuestion({
      ...GENERIC_REPEAT_ASK,
      criticalUnknown:
        'C2C 재판매가 한 번의 이벤트가 아니라 반복적으로 발생하는가. 이 루프가 없으면 1차 판매만 있는 브랜드이지 플랫폼 사업이 아니다.',
      decisionChangingEvidence:
        '최근 구매자의 실제 재판매 등록·거래·재구매 데이터. 이 데이터가 있으면 반복 가능한 양면 시장으로 판단을 올리고, 없으면 1차 판매 브랜드로 내린다.',
    });
    expect(resale.questionText).toMatch(/재판매 등록/);
    expect(resale.whyAsking).toMatch(/재판매/);

    const subscription = presentSiAiPmQuestion(GENERIC_REPEAT_ASK, {
      documentText: `감정 기록 AI 컴패니언이다.
수익 모델은 월 구독이다.
아직 반복 결제는 확인되지 않았다.`,
    });
    expect(subscription.questionText).toMatch(/구독|다시 결제/);
    expect(subscription.questionText).not.toMatch(/재판매/);
    expect(subscription.whyAsking).toMatch(/구독 유지|재결제/);
    expect(subscription.whyAsking).not.toMatch(/재판매/);

    const tourism = presentSiAiPmQuestion(GENERIC_REPEAT_ASK, {
      documentText: `영세 양조장의 온라인 마케팅을 연결한다.
타깃은 관광객과 FIT다.
양조장 대표가 결제 후보다.`,
    });
    expect(tourism.questionText).toMatch(/계약|관광 수요/);
    expect(tourism.questionText).not.toMatch(/재판매/);
    expect(tourism.whyAsking).toMatch(/계약|관광 수요/);
  });

  it('Pattern B: unnamed repeatability falls back to a second-action ask, not 재판매', () => {
    const spoken = presentSiAiPmQuestion(GENERIC_REPEAT_ASK);
    expect(spoken.questionText).toMatch(/두 번째 행동|반복 사용/);
    expect(spoken.questionText).not.toMatch(/재판매/);
    expect(spoken.whyAsking).toMatch(/두 번째 행동|반복성/);
    expect(spoken.whyAsking).not.toMatch(/재판매/);

    const journey = afterPaid(
      undefined,
      `지방 세무 사무소는 신고 마감을 수기로 처리해 어렵습니다.
기존 대안은 범용 ERP입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    );
    expect(journey.question.kind).toBe('repeat_loop');
    expect(journey.question.questionText).toMatch(/두 번째 행동|반복 사용/);
    expect(journey.question.questionText).not.toMatch(/재판매/);
  });

  it('Founder sources: paid conversion binds 구독 / 관광 수요 / C2C without brand branches', () => {
    const ridm = afterPaid('companion', sourceOf('ridm'));
    const juinjip = afterPaid('brewery-tour', sourceOf('juinjip'));
    const lmulm = resolveSiJourneyIntegration({
      title: 'resale-platform',
      businessDocument: sourceOf('lmulm'),
    }).current;
    const lmulmPositive = resolveSiJourneyIntegration({
      title: 'resale-platform',
      businessDocument: sourceOf('lmulm'),
      founderAnswer: '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.',
    }).current;
    const lmulmNegative = resolveSiJourneyIntegration({
      title: 'resale-platform',
      businessDocument: sourceOf('lmulm'),
      founderAnswer: '1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.',
    }).current;
    const lmulmPartial = resolveSiJourneyIntegration({
      title: 'resale-platform',
      businessDocument: sourceOf('lmulm'),
      founderAnswer: '재구매 2건은 있었으나 재판매 등록은 0건이다.',
    }).current;

    expect(ridm.question.kind).toBe('repeat_loop');
    expect(ridm.question.questionText).toMatch(/구독|다시 결제/);
    expect(ridm.question.questionText).not.toMatch(/재판매/);
    expect(ridm.question.whyAsking).toMatch(/구독 유지|재결제/);

    expect(juinjip.question.kind).toBe('repeat_loop');
    expect(juinjip.question.questionText).toMatch(/계약|관광 수요/);
    expect(juinjip.question.questionText).not.toMatch(/재판매/);
    expect(juinjip.question.whyAsking).toMatch(/계약|관광 수요/);

    expect(lmulm.question.kind).toBe('repeat_loop');
    expect(lmulm.question.questionText).toMatch(/재판매 등록/);
    expect(lmulmPositive.judgment.stageId).toBe('S4');
    expect(lmulmPositive.judgment.verdictId).toBe('conditionally_viable');
    expect(lmulmNegative.judgment.verdictId).not.toBe('viable');
    expect(lmulmNegative.judgment.stageId).toBe('S3');
    expect(lmulmPartial.judgment.stageId).not.toBe('S4');
    expect(lmulmNegative.question.questionText).toMatch(/재판매/);

    const payload = {
      productionFrozen: 'acbbf24',
      analyzerFrozen: 'c0b9bc3',
      ridmAfterPaid: {
        kind: ridm.question.kind,
        question: ridm.question.questionText,
        whyAsking: ridm.question.whyAsking,
        cu: ridm.judgment.criticalUnknown,
        dce: ridm.judgment.decisionChangingEvidence,
      },
      juinjipAfterPaid: {
        kind: juinjip.question.kind,
        question: juinjip.question.questionText,
        whyAsking: juinjip.question.whyAsking,
        cu: juinjip.judgment.criticalUnknown,
        dce: juinjip.judgment.decisionChangingEvidence,
      },
      lmulm: {
        t0Question: lmulm.question.questionText,
        positiveStage: lmulmPositive.judgment.stageId,
        negativeVerdict: lmulmNegative.judgment.verdictId,
        negativeStage: lmulmNegative.judgment.stageId,
        partialStage: lmulmPartial.judgment.stageId,
      },
    };
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  });
});
