import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import {
  genericSpoken,
  namesNextPeriod,
  scoreAccuracy,
  scoreStrategy,
  type LiveChain,
} from './score-si-decision-value-2pass';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-decision-value-2pass.json',
);
const PASS2_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-decision-value-2pass.ts'),
  'utf8',
);
const BATCH_SRC = readFileSync(
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
const BATCH_HEAD = 'e7e6dd3315affef3f3c6c4b21cebfe5210854647';

const CASES = [
  {
    id: 'logistics_omission',
    sector: 'B2B 물류',
    stake: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
  },
  {
    id: 'apparel_returns',
    sector: 'D2C 의류',
    stake: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
  },
  {
    id: 'support_load',
    sector: 'B2B 고객지원',
    stake: '부하',
    document: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
  },
  {
    id: 'marketplace_mismatch',
    sector: '중고 카탈로그',
    stake: '미스매치',
    document: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
  },
  {
    id: 'billing_inconsistency',
    sector: '병원 청구',
    stake: '불일치',
    document: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
  },
  {
    id: 'clinic_noshow',
    sector: '동네 의원',
    stake: 'no-show',
    document: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
  },
  {
    id: 'saas_churn',
    sector: 'B2B 온보딩',
    stake: '이탈',
    document: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
  },
  {
    id: 'warehouse_omission',
    sector: '식품 창고',
    stake: '누락',
    document: `식품 창고는 피킹 누락이 11%입니다.
기존 대안은 종이 피킹 리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
  },
  {
    id: 'resale_t0',
    sector: 'C2C 재판매',
    stake: '재판매',
    document: `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`,
  },
  {
    id: 'payer_split',
    sector: '양조장 마케팅',
    stake: '직무',
    document: `영세 양조장의 온라인 마케팅을 연결하는 사업입니다.
사용자는 전통주 체험을 원하는 관광객이고, 실제 비용을 내는 구매자는 양조장 대표가 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
양조장 대표가 마케팅비를 낼 의향인지도 확인되지 않았습니다.`,
    full: '결제자 3명이 실제로 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
  },
  {
    id: 'payer_job',
    sector: '감정 기록 컴패니언',
    stake: '직무',
    document: `감정과 기억을 함께 다루는 AI 컴패니언입니다.
아직 유료 고객과 결제자는 확인되지 않았습니다.
어떤 직무를 대체하는 제품인지도 검증되지 않았습니다.`,
    full: '결제자 1명이 실제로 월 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
  },
] as const;

function live(document: string, answer?: string): LiveChain {
  const view = resolveSiJourneyIntegration({
    title: 'decision-value-cpo-2pass',
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    whyAsking: q.whyAsking,
    questionText: q.questionText,
  };
}

describe('CPO 2-pass — Founder Decision Value Accuracy Batch', () => {
  it('keeps the 2-pass referee independent of the batch scorer and the engine', () => {
    expect(PASS2_SRC).not.toMatch(/from ['"]\.\/score-si-decision-value-repro['"]/);
    expect(BATCH_SRC).not.toMatch(/score-si-decision-value-2pass/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${PASS2_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('re-runs 11 live chains for Accuracy then Strategy', () => {
    const rows = CASES.map((fixture) => {
      const t0 = live(fixture.document);
      const promoted = 'full' in fixture && fixture.full ? live(fixture.document, fixture.full) : undefined;
      const accuracy = scoreAccuracy({ stake: fixture.stake, t0, promoted });
      const strategy = scoreStrategy({ t0, promoted });
      return {
        id: fixture.id,
        sector: fixture.sector,
        t0: {
          verdictId: t0.verdictId,
          stageId: t0.stageId,
          cu: t0.criticalUnknown,
          spoken: t0.questionText,
        },
        promoted: promoted
          ? {
              verdictId: promoted.verdictId,
              stageId: promoted.stageId,
              cu: promoted.criticalUnknown,
              whyAsking: promoted.whyAsking,
              spoken: promoted.questionText,
              generic: genericSpoken(promoted.questionText),
              nextPeriodBound: namesNextPeriod(promoted.criticalUnknown) && namesNextPeriod(promoted.questionText),
            }
          : null,
        accuracy,
        strategy,
      };
    });

    const accuracyCounts = {
      PASS: rows.filter((row) => row.accuracy.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.accuracy.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.accuracy.score === 'FAIL').length,
    };
    const strategyCounts = {
      PASS: rows.filter((row) => row.strategy.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.strategy.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.strategy.score === 'FAIL').length,
    };
    const genericAfterPromotion = rows.filter((row) => row.promoted?.generic).length;
    const verdict =
      accuracyCounts.FAIL === 0 && strategyCounts.FAIL === 0 && genericAfterPromotion === 0 ? 'PASS' : 'HOLD';

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          batchHead: BATCH_HEAD,
          production: 'UNCHANGED',
          merge: 'HOLD',
          fixGate: 'HOLD',
          verdict,
          accuracyCounts,
          strategyCounts,
          genericAfterPromotion,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(11);
    expect(genericAfterPromotion).toBe(0);
    expect(accuracyCounts.FAIL).toBe(0);
    expect(strategyCounts.FAIL).toBe(0);
    expect(verdict).toBe('PASS');
  });
});
