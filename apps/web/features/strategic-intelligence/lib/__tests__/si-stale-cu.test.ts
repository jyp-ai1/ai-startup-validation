import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import {
  classifyStaleCuVerdict,
  detectStaleSurfaces,
  isPromotedJudgment,
  type DceFill,
} from './stale-cu-definition';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-stale-cu.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const DEFINITION_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), './stale-cu-definition.ts'),
  'utf8',
);

const PAYMENT_ONLY = pickSiIntegrationAnswer('paid_conversion', 'validated');
const EXTRA_AFTER_FULL = '같은 유료 고객 2건이 다음 달에도 월 구독을 결제했다.';

const NAMELESS_CASES = {
  nameless_noshow: {
    noun: 'no-show',
    from: '18%',
    to: '9%',
    documentText: `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  nameless_returns: {
    noun: '반품률',
    from: '32%',
    to: '20%',
    documentText: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  nameless_churn: {
    noun: '이탈',
    from: '25%',
    to: '12%',
    documentText: `B2B 온보딩 팀은 첫 주 이탈이 25%에 달합니다.
기존 대안은 CRM 기본 알림과 범용 온보딩툴입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
} as const;

const CALIBRATION_IDS = ['clinicflow', 'fitbridge'] as const;
const FILLS: DceFill[] = ['dce_0_2', 'dce_1_2', 'dce_2_2', 'dce_2_2_extra'];

type CaseId = keyof typeof NAMELESS_CASES | (typeof CALIBRATION_IDS)[number];

function caseInput(id: CaseId): { title?: string; documentText: string } {
  if (id in NAMELESS_CASES) {
    return { documentText: NAMELESS_CASES[id as keyof typeof NAMELESS_CASES].documentText };
  }
  const fixture = getSiCalibrationCase(id as (typeof CALIBRATION_IDS)[number]);
  return { title: fixture.title, documentText: fixture.documentText };
}

function stakeFromUnknown(criticalUnknown: string): { noun: string; from: string; to: string } {
  if (/no-show|노쇼/i.test(criticalUnknown)) return { noun: 'no-show', from: '18%', to: '9%' };
  if (/반품/.test(criticalUnknown)) return { noun: '반품률', from: '32%', to: '20%' };
  if (/이탈/.test(criticalUnknown)) return { noun: '이탈', from: '25%', to: '12%' };
  return { noun: '수치화된 문제 지표', from: '20%', to: '10%' };
}

function answersFor(fill: DceFill, noun: string, from: string, to: string): string[] {
  const full = `결제 후보 2명이 월 구독을 결제했고 ${noun}가 ${from}에서 ${to}로 줄었다.`;
  if (fill === 'dce_0_2') return [];
  if (fill === 'dce_1_2') return [PAYMENT_ONLY];
  if (fill === 'dce_2_2') return [full];
  return [full, EXTRA_AFTER_FULL];
}

function snapshot(judgment: {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
}) {
  return {
    verdictId: judgment.verdictId,
    stageId: judgment.stageId,
    judgment: judgment.judgment,
    criticalUnknown: judgment.criticalUnknown,
    decisionChangingEvidence: judgment.decisionChangingEvidence,
    validationPriority: judgment.validationPriority,
  };
}

function runRow(id: CaseId, fill: DceFill) {
  const input = caseInput(id);
  const t0 = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: input.documentText,
  });
  const stake = stakeFromUnknown(t0.firstJudgment.criticalUnknown);
  const answers = answersFor(fill, stake.noun, stake.from, stake.to);
  let document = input.documentText;
  let last = t0;
  for (const answer of answers) {
    last = resolveSiJourneyIntegration({
      title: input.title,
      businessDocument: document,
      founderAnswer: answer,
    });
    document = appendFounderEvidenceToDocument(document, answer);
  }
  const now = last.current.judgment;
  const promoted = isPromotedJudgment(now);
  const completed = fill === 'dce_2_2' || fill === 'dce_2_2_extra';
  const stale = completed
    ? detectStaleSurfaces({
        criticalUnknown: now.criticalUnknown,
        decisionChangingEvidence: now.decisionChangingEvidence,
        validationPriority: now.validationPriority,
        nextQuestion: last.current.question.questionText,
      })
    : { cu: false, dce: false, priority: false, question: false };
  return {
    id,
    fill,
    generalized: id.startsWith('nameless_'),
    stake: stake.noun,
    answers,
    t0: {
      ...snapshot(t0.firstJudgment),
      question: t0.firstQuestion.questionText,
      kind: t0.firstQuestion.kind,
    },
    tFinal: snapshot(now),
    nextQuestion: last.current.question.questionText,
    nextKind: last.current.question.kind,
    promoted,
    stale,
    verdict: classifyStaleCuVerdict({ fill, promoted, stale }),
  };
}

const CASE_IDS = [...(Object.keys(NAMELESS_CASES) as Array<keyof typeof NAMELESS_CASES>), ...CALIBRATION_IDS];

describe('S.I. Stale CU after full DCE — measure only', () => {
  it('does not rewrite the engine and does not name brands in the definition', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(DEFINITION_SRC).not.toMatch(/클리닉플로우|ClinicFlow|핏브릿지|FitBridge|주인집|LMULM|RIDM/i);
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('records DCE fill 0/2 1/2 2/2 2/2+extra on nameless and calibration cases', () => {
    const rows = CASE_IDS.flatMap((id) => FILLS.map((fill) => runRow(id, fill)));
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');

    expect(rows).toHaveLength(20);

    const zero = rows.filter((row) => row.fill === 'dce_0_2');
    const one = rows.filter((row) => row.fill === 'dce_1_2');
    const two = rows.filter((row) => row.fill === 'dce_2_2');
    const extra = rows.filter((row) => row.fill === 'dce_2_2_extra');

    for (const row of [...zero, ...one]) {
      expect(row.promoted).toBe(false);
      expect(row.tFinal.stageId).not.toBe('S3');
      expect(row.verdict).toBe('N/A');
      expect(row.nextQuestion).not.toMatch(/재판매/);
    }

    for (const row of two) {
      expect(row.promoted).toBe(true);
      expect(row.tFinal.stageId).toBe('S3');
    }

    const namelessTwo = two.filter((row) => row.generalized);
    const brandTwo = two.filter((row) => !row.generalized);
    expect(namelessTwo).toHaveLength(3);
    expect(brandTwo).toHaveLength(2);
    expect(namelessTwo.every((row) => row.verdict === brandTwo[0]?.verdict)).toBe(true);
    expect(extra.every((row) => row.verdict === two[0]?.verdict)).toBe(true);
    expect(rows.every((row) => row.nextQuestion.includes('재판매'))).toBe(false);
  });

  it('keeps #104: payment-only on a nameless quantified problem stays off S3', () => {
    const t1 = analyzeStrategicIntelligence({
      documentText: appendFounderEvidenceToDocument(
        NAMELESS_CASES.nameless_churn.documentText,
        PAYMENT_ONLY,
      ),
    });
    expect(t1.verdictId).toBe('judgment_deferred');
    expect(t1.stageId).not.toBe('S3');
  });
});
