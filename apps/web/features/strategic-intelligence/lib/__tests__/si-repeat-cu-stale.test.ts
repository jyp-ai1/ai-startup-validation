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
  isRepeatCu,
  scoreAnsweredSpoken,
  spokenAsksRepeat,
  type Snap,
} from './score-si-repeat-cu-stale';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-repeat-cu-stale.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const CLASSIFY_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../classify-founder-evidence.ts'),
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
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 누락이 6%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  apparel_returns: {
    sector: 'D2C 의류',
    stake: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 반품률이 20%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  support_load: {
    sector: 'B2B 고객지원',
    stake: '부하',
    document: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    held: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 부하가 19%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  marketplace_mismatch: {
    sector: '중고 카탈로그',
    stake: '미스매치',
    document: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 미스매치가 10%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  billing_inconsistency: {
    sector: '병원 청구',
    stake: '불일치',
    document: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 불일치가 8%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  clinic_noshow: {
    sector: '동네 의원',
    stake: 'no-show',
    document: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    held: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 no-show가 12%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  saas_churn: {
    sector: 'B2B 온보딩',
    stake: '이탈',
    document: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 이탈이 21%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
  warehouse_omission: {
    sector: '식품 창고',
    stake: '누락',
    document: `식품 창고는 피킹 누락이 11%입니다.
기존 대안은 종이 피킹 리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
    held: '다음 기간에도 누락이 4%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    spokenFollow: '이미 결제한 고객 중 2명이 다음 달에도 다시 결제했고 반복 사용이 일어났다.',
    onStake: '다음 달에도 누락이 4%로 유지됐고 다음 고객 3곳에서도 같은 방향으로 줄었다.',
    planOnly: '다음 분기에 반복 사용을 측정할 예정이다.',
  },
} as const;

function snapOf(document: string, answer?: string): Snap {
  const view = resolveSiJourneyIntegration({
    title: 'repeat-cu-stale',
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    whyAsking: q.whyAsking,
    questionText: q.questionText,
    evidenceClass:
      view.current.update?.addedEvidence[0]?.evidenceClass ??
      (answer ? classifyFounderEvidenceClass(answer) : null),
  };
}

describe('Repeat-loop CU after held — measure only', () => {
  it('does not change analyzer, presenter, classifier, or brand-branch', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${CLASSIFY_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('records whether answering the spoken repeat question retires the CU', () => {
    const rows = Object.entries(CASES).map(([id, fixture]) => {
      const promoted = snapOf(fixture.document, fixture.full);
      const withFull = appendFounderEvidenceToDocument(fixture.document, fixture.full);
      const held = snapOf(withFull, fixture.held);
      const withHeld = appendFounderEvidenceToDocument(withFull, fixture.held);
      const spokenFollow = snapOf(withHeld, fixture.spokenFollow);
      const onStake = snapOf(withHeld, fixture.onStake);
      const planOnly = snapOf(withHeld, fixture.planOnly);
      return {
        id,
        sector: fixture.sector,
        stake: fixture.stake,
        promoted: {
          stageId: promoted.stageId,
          cu: promoted.criticalUnknown,
          spoken: promoted.questionText,
          nextPeriod: isNextPeriodCu(promoted.criticalUnknown),
        },
        held: {
          stageId: held.stageId,
          cu: held.criticalUnknown,
          spoken: held.questionText,
          repeatCu: isRepeatCu(held.criticalUnknown),
          spokenAsksRepeat: spokenAsksRepeat(held.questionText),
          generic: isGenericSpoken(held.questionText),
        },
        spokenFollow: {
          ...spokenFollow,
          scored: scoreAnsweredSpoken(held, spokenFollow),
        },
        onStake: {
          stageId: onStake.stageId,
          verdictId: onStake.verdictId,
          cu: onStake.criticalUnknown,
          evidenceClass: onStake.evidenceClass,
        },
        planOnly: {
          stageId: planOnly.stageId,
          cu: planOnly.criticalUnknown,
          evidenceClass: planOnly.evidenceClass,
        },
      };
    });

    const spokenScores = {
      PASS: rows.filter((row) => row.spokenFollow.scored.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.spokenFollow.scored.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.spokenFollow.scored.score === 'FAIL').length,
    };
    const verdictDiverges = rows.filter(
      (row) =>
        row.spokenFollow.verdictId !== row.onStake.verdictId ||
        row.spokenFollow.stageId !== row.onStake.stageId,
    ).length;

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          fixGate: spokenScores.FAIL > 0 && verdictDiverges > 0 ? 'CANDIDATE' : 'HOLD',
          scenarioCount: rows.length,
          spokenScores,
          verdictDiverges,
          genericHeld: rows.filter((row) => row.held.generic).length,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(8);
    expect(rows.every((row) => row.promoted.nextPeriod)).toBe(true);
    expect(rows.every((row) => row.held.repeatCu)).toBe(true);
    expect(rows.every((row) => row.held.spokenAsksRepeat)).toBe(true);
    expect(rows.every((row) => row.held.generic === false)).toBe(true);
    expect(spokenScores.FAIL).toBe(0);
    expect(verdictDiverges).toBe(0);
  });
});
