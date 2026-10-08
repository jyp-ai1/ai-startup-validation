import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { scoreDecisionValue, type DvActual } from './score-si-decision-value-batch';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-decision-value-batch.json',
);
const REFEREE_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './score-si-decision-value-batch.ts'),
  'utf8',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);

const PRODUCTION_SHA = '5cd89dc3bdbc78c845da35a8adff7577f81444b8';

const OMISSION = `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`;

const RESALE = `한정판 문구를 산 구매자가 이후 C2C로 재판매하는 모델입니다.
1차 판매 매출이 있다.
C2C 재판매가 반복적으로 발생하는지는 확인되지 않았다.`;

const FULL_OMISSION = '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.';
const HELD_OMISSION =
  '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.';
const WORSE_OMISSION = '다음 기간에 누락이 6%에서 18%로 늘었다.';

function actualOf(document: string, answer?: string): DvActual {
  const view = resolveSiJourneyIntegration({
    title: 'decision-value',
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

describe('Founder Decision Value Accuracy Batch — measure on Production 5cd89dc', () => {
  it('keeps the referee independent and brand-free', () => {
    expect(REFEREE_SRC).not.toMatch(/next-period-outcome|score-si-conversation-quality/);
    expect(`${ANALYZER_SRC}\n${REFEREE_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
  });

  it('dumps five-layer scores without changing Production code', () => {
    const t0 = actualOf(OMISSION);
    const full = actualOf(OMISSION, FULL_OMISSION);
    const held = actualOf(appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION), HELD_OMISSION);
    const worse = actualOf(appendFounderEvidenceToDocument(OMISSION, FULL_OMISSION), WORSE_OMISSION);
    const resale = actualOf(RESALE);

    const rows = [
      { id: 'omission_t0', scenario: '검수 누락 t0', actual: t0, scored: scoreDecisionValue(t0) },
      { id: 'omission_2_2', scenario: '2/2 후 next-period CU', actual: full, scored: scoreDecisionValue(full) },
      { id: 'omission_held', scenario: '다음 기간 유지', actual: held, scored: scoreDecisionValue(held) },
      { id: 'omission_worse', scenario: '다음 기간 악화', actual: worse, scored: scoreDecisionValue(worse) },
      { id: 'resale_t0', scenario: 'C2C 재판매 t0', actual: resale, scored: scoreDecisionValue(resale) },
    ];

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ productionSha: PRODUCTION_SHA, rows }, null, 2)}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.scored.layers.find((layer) => layer.id === 'strategy')?.score !== 'FAIL')).toBe(
      true,
    );
    expect(rows.every((row) => row.scored.layers.find((layer) => layer.id === 'accuracy')?.score === 'PASS')).toBe(
      true,
    );
  });
});
