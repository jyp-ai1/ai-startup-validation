import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  classifySpokenGenericBatch,
  type BatchRole,
  type BatchTurn,
  type ExpectedCu,
  type SpokenSurface,
} from './score-si-spoken-generic-batch';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-spoken-generic-batch.json',
);
const REFEREE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-spoken-generic-batch.ts'),
  'utf8',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const PRODUCTION_SHA = '5cd89dc3bdbc78c845da35a8adff7577f81444b8';

const CASES = {
  logistics_omission: {
    sector: 'B2B 물류',
    metric: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  apparel_returns: {
    sector: 'D2C 의류',
    metric: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  support_load: {
    sector: 'B2B 고객지원',
    metric: '부하',
    document: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 매크로 콘솔입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    held: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  marketplace_mismatch: {
    sector: '중고 카탈로그',
    metric: '미스매치',
    document: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  billing_inconsistency: {
    sector: '병원 청구',
    metric: '불일치',
    document: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    held: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  clinic_noshow: {
    sector: '동네 의원',
    metric: 'no-show',
    document: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    held: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  saas_churn: {
    sector: 'B2B 온보딩',
    metric: '이탈',
    document: `B2B 온보딩 툴은 첫 달 이탈이 37%입니다.
기존 대안은 스프레드시트 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 월 구독을 결제했고 이탈이 37%에서 21%로 줄었다.',
    held: '다음 기간에도 이탈이 21%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  warehouse_omission: {
    sector: '식품 창고',
    metric: '누락',
    document: `식품 창고는 피킹 누락이 11%입니다.
기존 대안은 종이 피킹 리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 5명이 월 구독을 결제했고 누락이 11%에서 4%로 줄었다.',
    held: '다음 기간에도 누락이 4%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
} as const;

const CONTROLS = {
  resale_t0: {
    sector: 'C2C 재판매',
    metric: 'C2C',
    document: `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`,
    answer: undefined as string | undefined,
    expectedCu: 'repeat' as const,
    turn: 't0' as const,
  },
  tourism_t0: {
    sector: '양조장 관광',
    metric: '관광 수요',
    document: `영세 양조장의 온라인 마케팅을 연결한다.
타깃은 관광객과 FIT다.
아직 앱은 출시되지 않았고 매출은 없다.`,
    answer: undefined as string | undefined,
    expectedCu: 'other' as const,
    turn: 't0' as const,
  },
  payment_only: {
    sector: 'B2B 물류',
    metric: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    answer: '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
    expectedCu: 'paid' as const,
    turn: 't0' as const,
  },
} as const;

function surfaceOf(document: string, answer?: string): SpokenSurface {
  const view = resolveSiJourneyIntegration({
    title: 'spoken-generic-batch',
    businessDocument: document,
    founderAnswer: answer,
  });
  return {
    kind: view.current.question.kind,
    verdictId: view.current.judgment.verdictId,
    stageId: view.current.judgment.stageId,
    criticalUnknown: view.current.judgment.criticalUnknown,
    decisionChangingEvidence: view.current.judgment.decisionChangingEvidence,
    validationPriority: view.current.judgment.validationPriority,
    questionText: view.current.question.questionText,
    whyAsking: view.current.question.whyAsking,
  };
}

function rowOf(input: {
  id: string;
  sector: string;
  metric: string;
  role: BatchRole;
  turn: BatchTurn;
  expectedCu: ExpectedCu;
  surface: SpokenSurface;
}) {
  return {
    id: input.id,
    sector: input.sector,
    metric: input.metric,
    role: input.role,
    turn: input.turn,
    expectedCu: input.expectedCu,
    actual: input.surface,
    referee: classifySpokenGenericBatch({
      role: input.role,
      turn: input.turn,
      expectedCu: input.expectedCu,
      surface: input.surface,
    }),
  };
}

describe('spoken_generic_after_promotion Accuracy Batch', () => {
  it('does not brand-branch or change analyzer / ask / presenter', () => {
    expect(`${ANALYZER_SRC}\n${ASK_SRC}\n${PRESENTER_SRC}\n${REFEREE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(REFEREE_SRC).not.toMatch(/from ['"]\.\.\/analyze-strategic-intelligence['"]/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
  });

  it('records CU / DCE / priority / whyAsking / spoken across businesses', () => {
    const rows = Object.entries(CASES).flatMap(([id, fixture]) => {
      const t0 = surfaceOf(fixture.document);
      const promoted = surfaceOf(fixture.document, fixture.full);
      const held = surfaceOf(appendFounderEvidenceToDocument(fixture.document, fixture.full), fixture.held);
      return [
        rowOf({
          id: `${id}_t0`,
          sector: fixture.sector,
          metric: fixture.metric,
          role: 'control',
          turn: 't0',
          expectedCu: 'paid',
          surface: t0,
        }),
        rowOf({
          id: `${id}_promoted`,
          sector: fixture.sector,
          metric: fixture.metric,
          role: 'candidate',
          turn: 'promoted',
          expectedCu: 'next_period',
          surface: promoted,
        }),
        rowOf({
          id: `${id}_held`,
          sector: fixture.sector,
          metric: fixture.metric,
          role: 'control',
          turn: 'held',
          expectedCu: 'repeat',
          surface: held,
        }),
      ];
    });

    for (const [id, fixture] of Object.entries(CONTROLS)) {
      rows.push(
        rowOf({
          id,
          sector: fixture.sector,
          metric: fixture.metric,
          role: 'control',
          turn: fixture.turn,
          expectedCu: fixture.expectedCu,
          surface: surfaceOf(fixture.document, fixture.answer),
        }),
      );
    }

    const candidates = rows.filter((row) => row.role === 'candidate');
    const controls = rows.filter((row) => row.role === 'control');
    const failures = rows.filter((row) => row.referee.failure);
    const repro = candidates.filter((row) => row.referee.pattern === 'spoken_generic_after_promotion');
    const obstruction = rows.filter((row) => row.referee.patternAObstruction);

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          pattern: 'spoken_generic_after_promotion',
          candidateCount: candidates.length,
          reproCount: repro.length,
          controlCount: controls.length,
          failureCount: failures.length,
          patternAObstructionCount: obstruction.length,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(candidates).toHaveLength(8);
    expect(repro).toHaveLength(8);
    expect(failures).toEqual([]);
    expect(obstruction).toEqual([]);
    expect(controls.every((row) => row.referee.pattern !== 'spoken_generic_after_promotion')).toBe(
      true,
    );
  });
});
