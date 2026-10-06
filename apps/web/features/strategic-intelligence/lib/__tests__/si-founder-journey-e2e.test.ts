import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { SiValidationKind } from '@repo/types/domain/strategic-intelligence';

import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import {
  adaptFounderJourneyQuestion,
  resolveSiV1ValidationPriority,
} from '../resolve-si-v1-validation-priority';

const GATE_CASES = ['lmulm', 'clinicflow', 'fitbridge'] as const;
const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-journey-e2e.json',
);

const ENGINE_SRC = [
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../update-strategic-intelligence.ts'),
    'utf8',
  ),
  readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../resolve-si-v1-validation-priority.ts'),
    'utf8',
  ),
].join('\n');

function secondTurnAnswer(kind: SiValidationKind): string {
  if (kind === 'repeat_loop') {
    return '같은 구매 코호트에서 18명이 실제 재판매를 등록했고 9건이 거래됐다.';
  }
  if (kind === 'payer_job') {
    return '결제자 2명이 실제로 월 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.';
  }
  if (kind === 'payer_split') {
    return '결제자 2명이 실제로 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.';
  }
  if (kind === 'paid_conversion') {
    return '결제 후보 3명이 월 구독을 결제했고 유료 전환 2건이 발생했다.';
  }
  if (kind === 'segment_proof') {
    return '지목한 고객 6명이 실제로 예약하고 지불했다.';
  }
  return '최근 고객 4명이 실제로 결제했고 유료 전환 2건이 발생했다.';
}

function runTwoTurns(id: (typeof GATE_CASES)[number]) {
  const fixture = getSiCalibrationCase(id);
  const t0 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
  });
  const answer1 = pickSiIntegrationAnswer(t0.firstQuestion.kind, 'validated');
  const t1 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
    founderAnswer: answer1,
  });
  const documentAfter1 = appendFounderEvidenceToDocument(fixture.documentText, answer1);
  const t1Ask = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: documentAfter1,
  });
  const answer2 = secondTurnAnswer(t1Ask.firstQuestion.kind);
  const t2 = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: documentAfter1,
    founderAnswer: answer2,
  });
  return { fixture, t0, t1, t1Ask, t2, answer1, answer2, documentAfter1 };
}

describe('S.I. Founder Journey E2E Gate', () => {
  it('does not import the question engine or special-case brands', () => {
    expect(ENGINE_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(ENGINE_SRC).not.toMatch(/주인집|LMULM|RIDM|클리닉플로우|핏브릿지|ClinicFlow|FitBridge/i);
  });

  it('falls back to the gap loop when S.I. has no document', () => {
    const none = resolveSiV1ValidationPriority({ documentText: '' });
    const adapted = adaptFounderJourneyQuestion({
      siPriority: none,
      gapQuestionText: '이 사업은 누구에게 무엇을 제공하나요?',
    });
    expect(none.present).toBe(false);
    expect(adapted.source).toBe('gap-loop-fallback');
  });

  it.each(GATE_CASES)(
    '%s: two evidence updates move judgment, unknown, and next priority',
    (id) => {
      const { t0, t1, t1Ask, t2, answer1, answer2 } = runTwoTurns(id);

      expect(t1.current.update?.source).toBe('si-v1-update');
      expect(t2.current.update?.source).toBe('si-v1-update');
      expect(t1.current.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
      expect(t2.current.update?.addedEvidence[0]?.evidenceClass).toBe('VALIDATED');
      expect(t1.current.update?.addedEvidence[0]?.text).toBe(answer1);
      expect(t2.current.update?.addedEvidence[0]?.text).toBe(answer2);

      expect(t1Ask.firstQuestion.questionText).not.toBe(t0.firstJudgment.criticalUnknown);
      expect(t2.current.question.questionText).not.toBe(t2.current.judgment.criticalUnknown);

      const firstMoved =
        t1.current.update?.judgmentChanged ||
        t1.current.update?.criticalUnknownChanged ||
        t1.current.update?.validationPriorityChanged;
      expect(firstMoved).toBe(true);

      const secondRecomputed =
        t2.current.judgment.judgment !== t1.current.judgment.judgment ||
        t2.current.judgment.criticalUnknown !== t1.current.judgment.criticalUnknown ||
        t2.current.judgment.validationPriority !== t1.current.judgment.validationPriority ||
        t2.current.judgment.evidenceMap.length !== t1.current.judgment.evidenceMap.length;
      expect(secondRecomputed).toBe(true);

      expect(t1.current.judgment.criticalUnknown).not.toBe(t0.firstJudgment.criticalUnknown);
      expect(t1.current.judgment.validationPriority).not.toBe(t0.firstJudgment.validationPriority);
      if (id === 'lmulm') {
        expect(t0.firstJudgment.stageId).toBe('S3');
        expect(t1.current.judgment.stageId).toBe('S4');
        expect(t0.firstJudgment.criticalUnknown).toMatch(/C2C|재판매/);
        expect(t1.current.judgment.criticalUnknown).toMatch(/반복/);
        expect(t1.current.judgment.validationPriority).toMatch(/두 번째 행동/);
      }
    },
  );

  it('writes the three-business two-turn dump', () => {
    const rows = GATE_CASES.map((id) => {
      const { t0, t1, t1Ask, t2, answer1, answer2 } = runTwoTurns(id);
      return {
        id,
        t0: {
          stageId: t0.firstJudgment.stageId,
          verdictId: t0.firstJudgment.verdictId,
          criticalUnknown: t0.firstJudgment.criticalUnknown,
          validationPriority: t0.firstJudgment.validationPriority,
          question: t0.firstQuestion.questionText,
        },
        t1: {
          stageId: t1.current.judgment.stageId,
          verdictId: t1.current.judgment.verdictId,
          criticalUnknown: t1.current.judgment.criticalUnknown,
          validationPriority: t1.current.judgment.validationPriority,
          question: t1Ask.firstQuestion.questionText,
          answer: answer1,
          judgmentChanged: t1.current.update?.judgmentChanged ?? false,
          criticalUnknownChanged: t1.current.update?.criticalUnknownChanged ?? false,
          validationPriorityChanged: t1.current.update?.validationPriorityChanged ?? false,
        },
        t2: {
          stageId: t2.current.judgment.stageId,
          verdictId: t2.current.judgment.verdictId,
          criticalUnknown: t2.current.judgment.criticalUnknown,
          validationPriority: t2.current.judgment.validationPriority,
          question: t2.current.question.questionText,
          answer: answer2,
          judgmentChanged: t2.current.update?.judgmentChanged ?? false,
          criticalUnknownChanged: t2.current.update?.criticalUnknownChanged ?? false,
          validationPriorityChanged: t2.current.update?.validationPriorityChanged ?? false,
          evidenceCount: t2.current.judgment.evidenceMap.length,
        },
      };
    });
    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.t1.criticalUnknownChanged || row.t1.validationPriorityChanged)).toBe(
      true,
    );
  });
});
