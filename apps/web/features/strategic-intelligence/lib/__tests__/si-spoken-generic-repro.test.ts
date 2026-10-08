import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { classifySpokenGeneric, type ReproActual } from './score-si-spoken-generic-repro';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-spoken-generic-repro.json',
);
const REFEREE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-spoken-generic-repro.ts'),
  'utf8',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

const PRODUCTION_SHA = '5cd89dc3bdbc78c845da35a8adff7577f81444b8';

const CASES = {
  omission: {
    metric: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  returns: {
    metric: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  load: {
    metric: '부하',
    document: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 Zendesk 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    held: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
  mismatch: {
    metric: '미스매치',
    document: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 Notion 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    held: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
  },
} as const;

const RESALE = `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`;

function actualOf(document: string, answer?: string): ReproActual {
  const view = resolveSiJourneyIntegration({
    title: 'spoken-generic-repro',
    businessDocument: document,
    founderAnswer: answer,
  });
  return {
    kind: view.current.question.kind,
    verdictId: view.current.judgment.verdictId,
    stageId: view.current.judgment.stageId,
    criticalUnknown: view.current.judgment.criticalUnknown,
    validationPriority: view.current.judgment.validationPriority,
    questionText: view.current.question.questionText,
    whyAsking: view.current.question.whyAsking,
  };
}

describe('spoken_generic_after_promotion reproducibility', () => {
  it('does not brand-branch or import the Decision Value self-scorer', () => {
    expect(REFEREE_SRC).not.toMatch(/score-si-decision-value-batch|next-period-outcome/);
    expect(`${ANALYZER_SRC}\n${REFEREE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('measures the pattern on four metrics plus controls', () => {
    const rows = Object.entries(CASES).flatMap(([id, fixture]) => {
      const t0 = actualOf(fixture.document);
      const after22 = actualOf(fixture.document, fixture.full);
      const held = actualOf(appendFounderEvidenceToDocument(fixture.document, fixture.full), fixture.held);
      return [
        { id: `${id}_t0`, role: 'control', metric: fixture.metric, actual: t0, referee: classifySpokenGeneric(t0) },
        {
          id: `${id}_2_2`,
          role: 'candidate',
          metric: fixture.metric,
          actual: after22,
          referee: classifySpokenGeneric(after22),
        },
        {
          id: `${id}_held`,
          role: 'control',
          metric: fixture.metric,
          actual: held,
          referee: classifySpokenGeneric(held),
        },
      ];
    });

    const resale = actualOf(RESALE);
    rows.push({
      id: 'resale_t0',
      role: 'control',
      metric: 'C2C',
      actual: resale,
      referee: classifySpokenGeneric(resale),
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ productionSha: PRODUCTION_SHA, pattern: 'spoken_generic_after_promotion', rows }, null, 2)}\n`,
      'utf8',
    );

    const candidates = rows.filter((row) => row.role === 'candidate');
    const controls = rows.filter((row) => row.role === 'control');
    expect(candidates).toHaveLength(4);
    expect(candidates.every((row) => row.referee.score === 'REPRO')).toBe(true);
    expect(controls.every((row) => row.referee.score !== 'REPRO')).toBe(true);
  });
});
