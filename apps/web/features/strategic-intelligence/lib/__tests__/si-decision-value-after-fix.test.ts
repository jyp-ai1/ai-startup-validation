import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  isGenericSpoken,
  scoreDecisionValue,
  type DvActual,
} from './score-si-decision-value-after-fix';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-decision-value-after-fix.json',
);
const REFEREE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-decision-value-after-fix.ts'),
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
  omission: {
    sector: 'B2B 물류',
    metric: '누락',
    document: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    held: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 누락이 6%에서 18%로 늘었다.',
  },
  returns: {
    sector: 'D2C 의류',
    metric: '반품률',
    document: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 글로벌 핏 위젯입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 2명이 월 구독을 결제했고 반품률이 32%에서 20%로 줄었다.',
    held: '다음 기간에도 반품률이 20%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 반품률이 20%에서 34%로 늘었다.',
  },
  noshow: {
    sector: '동네 의원',
    metric: 'no-show',
    document: `동네 의원은 예약 no-show가 22%입니다.
기존 대안은 전화 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    full: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
    held: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    worse: '다음 기간에 no-show가 12%에서 24%로 늘었다.',
  },
} as const;

const RESALE = `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`;

function actualOf(document: string, answer?: string): DvActual {
  const view = resolveSiJourneyIntegration({
    title: 'decision-value-after-fix',
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

describe('Founder Decision Value after spoken-generic fix — Production 0b46522', () => {
  it('keeps the referee independent and does not change analyzer/presenter source in this batch', () => {
    expect(REFEREE_SRC).not.toMatch(/next-period-outcome|score-si-conversation-quality/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${REFEREE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/NEXT_PERIOD_QUESTION/);
  });

  it('measures five layers after the presentation fix', () => {
    const rows = Object.entries(CASES).flatMap(([id, fixture]) => {
      const t0 = actualOf(fixture.document);
      const full = actualOf(fixture.document, fixture.full);
      const held = actualOf(appendFounderEvidenceToDocument(fixture.document, fixture.full), fixture.held);
      const worse = actualOf(appendFounderEvidenceToDocument(fixture.document, fixture.full), fixture.worse);
      return [
        {
          id: `${id}_t0`,
          sector: fixture.sector,
          scenario: `${fixture.metric} t0`,
          actual: t0,
          scored: scoreDecisionValue(t0),
        },
        {
          id: `${id}_2_2`,
          sector: fixture.sector,
          scenario: `${fixture.metric} 2/2 → next-period CU`,
          actual: full,
          scored: scoreDecisionValue(full),
        },
        {
          id: `${id}_held`,
          sector: fixture.sector,
          scenario: `${fixture.metric} 다음 기간 유지`,
          actual: held,
          scored: scoreDecisionValue(held),
        },
        {
          id: `${id}_worse`,
          sector: fixture.sector,
          scenario: `${fixture.metric} 다음 기간 악화`,
          actual: worse,
          scored: scoreDecisionValue(worse),
        },
      ];
    });

    const resale = actualOf(RESALE);
    rows.push({
      id: 'resale_t0',
      sector: 'C2C 재판매',
      scenario: 'C2C 재판매 t0',
      actual: resale,
      scored: scoreDecisionValue(resale),
    });

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ productionSha: PRODUCTION_SHA, patternClosed: 'spoken_generic_after_promotion', rows }, null, 2)}\n`,
      'utf8',
    );

    const promoted = rows.filter((row) => row.id.endsWith('_2_2'));
    expect(promoted).toHaveLength(3);
    expect(promoted.every((row) => row.scored.overall === 'PASS')).toBe(true);
    expect(promoted.every((row) => /다음 고객|다음 기간/.test(row.actual.criticalUnknown))).toBe(true);
    expect(promoted.every((row) => /다음 고객|다음 기간/.test(row.actual.questionText))).toBe(true);
    expect(promoted.every((row) => !isGenericSpoken(row.actual.questionText))).toBe(true);
    expect(rows.every((row) => row.scored.layers.find((layer) => layer.id === 'accuracy')?.score === 'PASS')).toBe(
      true,
    );
    expect(rows.every((row) => row.scored.layers.find((layer) => layer.id === 'strategy')?.score !== 'FAIL')).toBe(
      true,
    );
    expect(rows.every((row) => !isGenericSpoken(row.actual.questionText))).toBe(true);
  });
});
