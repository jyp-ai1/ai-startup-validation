import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { presentSiAiPmQuestion } from '../present-si-ai-pm-question';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-spoken-generic-fix.json',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
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

const PRODUCTION_SHA = '5cd89dc3bdbc78c845da35a8adff7577f81444b8';
const GENERIC_SPOKEN = /실제 행동 증거가 필요합니다/;
const NEXT_PERIOD = /다음 고객|다음 기간/;

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

function viewOf(document: string, answer?: string) {
  return resolveSiJourneyIntegration({
    title: 'spoken-generic-fix',
    businessDocument: document,
    founderAnswer: answer,
  });
}

describe('spoken_generic_after_promotion presentation fix', () => {
  it('does not brand-branch, rewrite analyzer, or change kind detection', () => {
    expect(`${PRESENTER_SRC}\n${ANALYZER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('binds a next-period triad to a concrete held-outcome question', () => {
    const question = presentSiAiPmQuestion({
      kind: 'generic',
      criticalUnknown:
        '이번 성과가 다음 고객이나 다음 기간에도 같은 방향으로 이어지는가. 1회 결과만이면 판단을 확정할 수 없다.',
      decisionChangingEvidence:
        '다음 고객 또는 다음 기간에서 같은 성과가 유지되는지. 유지되면 판단을 유지하고, 1회성이면 내린다.',
      validationPriority: '다음 고객 또는 다음 기간에서 같은 성과가 반복되는지 한 번 확인한다.',
      source: 'si-v1',
    });
    expect(question.kind).toBe('generic');
    expect(question.questionText).toMatch(NEXT_PERIOD);
    expect(question.questionText).not.toMatch(GENERIC_SPOKEN);
    expect(question.whyAsking).toMatch(NEXT_PERIOD);
  });

  it('keeps unknown-axis generic Pattern A when the triad has no next-period CU', () => {
    const question = presentSiAiPmQuestion({
      kind: 'generic',
      criticalUnknown: '이 판단의 근거가 아직 닫히지 않았다.',
      decisionChangingEvidence: '실제 행동으로 판단을 바꿀 수 있는 증거가 필요하다.',
      validationPriority: '확인된 사실 한 건을 받는다.',
      source: 'si-v1',
    });
    expect(question.questionText).toMatch(GENERIC_SPOKEN);
    expect(question.questionText).not.toMatch(NEXT_PERIOD);
  });

  it('clears generic-after-promotion on eight sectors', () => {
    const rows = Object.entries(CASES).map(([id, fixture]) => {
      const t0 = viewOf(fixture.document);
      const promoted = viewOf(fixture.document, fixture.full);
      const held = viewOf(appendFounderEvidenceToDocument(fixture.document, fixture.full), fixture.held);
      return {
        id,
        sector: fixture.sector,
        metric: fixture.metric,
        t0: {
          kind: t0.current.question.kind,
          cu: t0.current.judgment.criticalUnknown,
          dce: t0.current.judgment.decisionChangingEvidence,
          priority: t0.current.judgment.validationPriority,
          whyAsking: t0.current.question.whyAsking,
          spoken: t0.current.question.questionText,
        },
        promoted: {
          kind: promoted.current.question.kind,
          stageId: promoted.current.judgment.stageId,
          verdictId: promoted.current.judgment.verdictId,
          cu: promoted.current.judgment.criticalUnknown,
          dce: promoted.current.judgment.decisionChangingEvidence,
          priority: promoted.current.judgment.validationPriority,
          whyAsking: promoted.current.question.whyAsking,
          spoken: promoted.current.question.questionText,
        },
        held: {
          kind: held.current.question.kind,
          cu: held.current.judgment.criticalUnknown,
          spoken: held.current.question.questionText,
        },
      };
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ productionSha: PRODUCTION_SHA, pattern: 'spoken_generic_after_promotion', rows }, null, 2)}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(8);
    for (const row of rows) {
      expect(row.promoted.cu).toMatch(NEXT_PERIOD);
      expect(row.promoted.dce).toMatch(NEXT_PERIOD);
      expect(row.promoted.priority).toMatch(NEXT_PERIOD);
      expect(row.promoted.whyAsking).toMatch(NEXT_PERIOD);
      expect(row.promoted.spoken).toMatch(NEXT_PERIOD);
      expect(row.promoted.spoken).not.toMatch(GENERIC_SPOKEN);
      expect(row.t0.spoken).not.toMatch(GENERIC_SPOKEN);
      expect(row.held.spoken).not.toMatch(GENERIC_SPOKEN);
      expect(row.held.cu).toMatch(/반복 가능/);
    }
  });
});
