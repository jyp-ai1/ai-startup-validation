import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  isGenericSpoken,
  isNextPeriodCu,
  scoreDecisionValue,
  scoreHeldFollowupImpact,
  type DvActual,
  type ObservationId,
  type StrategicImpact,
} from './score-si-decision-value-repro';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-decision-value-repro.json',
);
const REFEREE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-decision-value-repro.ts'),
  'utf8',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const PRODUCTION_SHA = '0b465226516e1a4f3eb9ce2087f8bca2c2c091da';

const CASES = {
  logistics_omission: {
    sector: 'B2B 물류',
    stake: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 3명이 월 구독을 결제했다.',
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 누락이 6%에서 18%로 늘었다.',
    onStake: '다음 달에도 누락이 6%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  apparel_returns: {
    sector: 'D2C 의류',
    stake: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 2명이 월 구독을 결제했다.',
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 반품률이 20%에서 34%로 늘었다.',
    onStake: '다음 달에도 반품률이 20%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  support_load: {
    sector: 'B2B 고객지원',
    stake: '부하',
    document: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 4명이 연 계약을 결제했다.',
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    held: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 부하가 19%에서 38%로 늘었다.',
    onStake: '다음 달에도 부하가 19%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  marketplace_mismatch: {
    sector: '중고 카탈로그',
    stake: '미스매치',
    document: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 2명이 구독을 결제했다.',
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 미스매치가 10%에서 21%로 늘었다.',
    onStake: '다음 달에도 미스매치가 10%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  billing_inconsistency: {
    sector: '병원 청구',
    stake: '불일치',
    document: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 6명이 월 구독을 결제했다.',
    full: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 불일치가 8%에서 17%로 늘었다.',
    onStake: '다음 달에도 불일치가 8%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  clinic_noshow: {
    sector: '동네 의원',
    stake: 'no-show',
    document: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 3명이 연 계약을 결제했다.',
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    held: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 no-show가 12%에서 24%로 늘었다.',
    onStake: '다음 달에도 no-show가 12%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  saas_churn: {
    sector: 'B2B 온보딩',
    stake: '이탈',
    document: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 4명이 월 구독을 결제했다.',
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 이탈이 21%에서 36%로 늘었다.',
    onStake: '다음 달에도 이탈이 21%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  warehouse_omission: {
    sector: '식품 창고',
    stake: '누락',
    document: `식품 창고는 피킹 누락이 11%입니다.
기존 대안은 종이 피킹 리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    paymentOnly: '결제 후보 5명이 월 구독을 결제했다.',
    full: '결제 후보 5명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
    held: '다음 기간에도 누락이 4%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 누락이 4%에서 12%로 늘었다.',
    onStake: '다음 달에도 누락이 4%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
} as const;

const WRONG_AXIS = '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.';

const RESALE = `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`;

const PAYER_SPLIT = `영세 양조장의 온라인 마케팅을 연결하는 사업입니다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
양조장 대표가 마케팅비를 낼 의향인지도 확인되지 않았습니다.`;

const PAYER_JOB = `감정과 기억을 함께 다루는 AI 컴패니언입니다.
아직 유료 고객과 결제자는 확인되지 않았습니다.
어떤 직무를 대체하는 제품인지도 검증되지 않았습니다.`;

function actualOf(document: string, answer?: string): DvActual {
  const view = resolveSiJourneyIntegration({
    title: 'decision-value-repro',
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    whyPossible: j.whyPossible,
    whyFail: j.whyFail,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    questionText: q.questionText,
    whyAsking: q.whyAsking,
    evidenceClass: view.current.update?.addedEvidence[0]?.evidenceClass ??
      (answer ? classifyFounderEvidenceClass(answer) : null),
    evidenceStrengthDelta: view.current.update?.evidenceStrengthDelta ?? null,
  };
}

function compact(actual: DvActual) {
  return {
    verdictId: actual.verdictId,
    stageId: actual.stageId,
    criticalUnknown: actual.criticalUnknown,
    questionText: actual.questionText,
    whyAsking: actual.whyAsking,
    evidenceClass: actual.evidenceClass,
    evidenceStrengthDelta: actual.evidenceStrengthDelta,
  };
}

describe('Founder Decision Value reproducibility — Production 0b46522', () => {
  it('keeps the referee independent and does not change analyzer/presenter source in this batch', () => {
    expect(REFEREE_SRC).not.toMatch(/next-period-outcome|score-si-conversation-quality/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${REFEREE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('measures whether Decision Value findings repeat and change Founder strategy', () => {
    const observationCounts: Record<ObservationId, number> = {
      spoken_generic_after_promotion: 0,
      payment_only_promoted: 0,
      plan_only_closes_cu: 0,
      stake_dropped_after_held: 0,
      answered_spoken_stale_cu: 0,
      spoken_followup_diverges: 0,
      wrong_axis_promotes: 0,
    };
    const impactCounts: Record<StrategicImpact, number> = {
      NONE: 0,
      OBSERVED: 0,
      IMPACT: 0,
    };

    const rows = Object.entries(CASES).map(([id, fixture]) => {
      const t0 = actualOf(fixture.document);
      const payment = actualOf(fixture.document, fixture.paymentOnly);
      const full = actualOf(fixture.document, fixture.full);
      const withFull = appendFounderEvidenceToDocument(fixture.document, fixture.full);
      const planAfter = actualOf(withFull, fixture.planOnly);
      const worse = actualOf(withFull, fixture.worse);
      const held = actualOf(withFull, fixture.held);
      const withHeld = appendFounderEvidenceToDocument(withFull, fixture.held);
      const onStake = actualOf(withHeld, fixture.onStake);
      const spokenFollow = actualOf(withHeld, fixture.spokenFollow);
      const wrongAxis = actualOf(withHeld, WRONG_AXIS);
      const planHeld = actualOf(withHeld, fixture.planOnly);
      const impact = scoreHeldFollowupImpact({
        stake: fixture.stake,
        held,
        onStake,
        spokenFollow,
        wrongAxis,
        planOnly: planHeld,
      });

      if (isGenericSpoken(full.questionText)) observationCounts.spoken_generic_after_promotion += 1;
      if (isNextPeriodCu(payment.criticalUnknown) && payment.stageId === 'S3') {
        observationCounts.payment_only_promoted += 1;
      }
      for (const observation of impact.observations) {
        observationCounts[observation] += 1;
      }
      impactCounts[impact.strategicImpact] += 1;

      return {
        id,
        sector: fixture.sector,
        stake: fixture.stake,
        t0: { actual: t0, scored: scoreDecisionValue(t0) },
        paymentOnly: { actual: payment, scored: scoreDecisionValue(payment) },
        promoted: { actual: full, scored: scoreDecisionValue(full) },
        planAfterPromotion: compact(planAfter),
        worse: { actual: worse, scored: scoreDecisionValue(worse) },
        held: { actual: held, scored: scoreDecisionValue(held) },
        followups: {
          onStake: compact(onStake),
          spokenFollow: compact(spokenFollow),
          wrongAxis: compact(wrongAxis),
          planOnly: compact(planHeld),
        },
        impact,
      };
    });

    const extras = [
      { id: 'resale_t0', sector: 'C2C 재판매', actual: actualOf(RESALE) },
      {
        id: 'resale_validated',
        sector: 'C2C 재판매',
        actual: actualOf(RESALE, WRONG_AXIS),
      },
      { id: 'payer_split_t0', sector: '양조장 마케팅', actual: actualOf(PAYER_SPLIT) },
      {
        id: 'payer_split_validated',
        sector: '양조장 마케팅',
        actual: actualOf(
          PAYER_SPLIT,
          '결제자 3명이 실제로 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
        ),
      },
      { id: 'payer_job_t0', sector: '감정 기록 컴패니언', actual: actualOf(PAYER_JOB) },
      {
        id: 'payer_job_validated',
        sector: '감정 기록 컴패니언',
        actual: actualOf(
          PAYER_JOB,
          '결제자 1명이 실제로 월 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
        ),
      },
    ].map((row) => ({
      ...row,
      scored: scoreDecisionValue(row.actual),
    }));

    const promoted = rows.map((row) => row.promoted);
    const held = rows.map((row) => row.held);
    const dump = {
      productionSha: PRODUCTION_SHA,
      priorBatch: '#136',
      closedPattern: 'spoken_generic_after_promotion',
      fixGate: 'NOT_OPEN',
      sectorCount: rows.length,
      extraCount: extras.length,
      layerCounts: {
        promotedPass: promoted.filter((row) => row.scored.overall === 'PASS').length,
        heldPass: held.filter((row) => row.scored.overall === 'PASS').length,
        extraPass: extras.filter((row) => row.scored.overall === 'PASS').length,
      },
      observationCounts,
      impactCounts,
      rows,
      extras,
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(dump, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(8);
    expect(promoted.every((row) => row.scored.overall === 'PASS')).toBe(true);
    expect(promoted.every((row) => isNextPeriodCu(row.actual.criticalUnknown))).toBe(true);
    expect(promoted.every((row) => isNextPeriodCu(row.actual.questionText))).toBe(true);
    expect(promoted.every((row) => !isGenericSpoken(row.actual.questionText))).toBe(true);
    expect(observationCounts.spoken_generic_after_promotion).toBe(0);
    expect(observationCounts.payment_only_promoted).toBe(0);
    expect(observationCounts.spoken_followup_diverges).toBe(0);
    expect(observationCounts.stake_dropped_after_held).toBe(8);
    expect(impactCounts.IMPACT).toBe(0);
    expect(held.every((row) => !isGenericSpoken(row.actual.questionText))).toBe(true);
    expect(extras.every((row) => row.scored.layers.find((layer) => layer.id === 'strategy')?.score !== 'FAIL')).toBe(
      true,
    );
  });
});
