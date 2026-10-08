import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CLINICFLOW_DOCUMENT,
  FITBRIDGE_DOCUMENT,
  LOCAL_SNS_DOCUMENT,
} from '@/lib/demo/demo-seed-documents';
import { classifyFounderEvidence } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-dv-batch5-671005f.json',
);

const ANSWERS = {
  clinicSemanticFull:
    '결제 후보 2곳이 월 구독을 결제했고 no-show가 22%에서 12%로 줄었다.',
  clinicTokenFull:
    '결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했으며 no-show가 22%에서 12%로 줄었다.',
  clinicPartialPay: '결제 후보 2곳이 월 구독을 결제했고 유료 전환 2건이 발생했다.',
  clinicPartialStake: 'no-show가 22%에서 12%로 줄었지만 아직 한 건도 결제되지 않았다.',
  clinicAssumption: '유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.',
  fitSemanticFull: '결제 후보 2곳이 위젯을 결제했고 반품률이 38%에서 29%로 줄었다.',
  fitTokenFull:
    '결제 후보 2곳이 위젯을 결제했고 유료 전환 2건이 발생했으며 반품률이 38%에서 29%로 줄었다.',
  fitPartialPay: '결제 후보 2곳이 위젯을 결제했고 유료 전환 2건이 발생했다.',
  fitPartialStake: '반품률이 38%에서 29%로 줄었지만 아직 한 건도 결제되지 않았다.',
  fitAssumption: '브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.',
  localSemanticFull:
    '파일럿 사장 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
  localTokenFull:
    '파일럿 사장 2명이 월 구독을 결제했고 유료 전환 2건이 발생했으며 주간 게시가 반복됐다.',
  localPartialPay: '파일럿 사장 1명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
  localAssumption: '유료 제안을 생각하고 있지만 아직 아무도 결제하지 않았다.',
} as const;

function play(title: string, document: string, answer?: string) {
  const t0 = resolveSiJourneyIntegration({ title, businessDocument: document });
  const view = resolveSiJourneyIntegration({
    title,
    businessDocument: document,
    founderAnswer: answer,
  });
  const j0 = t0.current.judgment;
  const j = view.current.judgment;
  const q = view.current.question;
  const u = view.current.update;
  return {
    t0: {
      verdictId: j0.verdictId,
      stageId: j0.stageId,
      headline: j0.judgment,
      criticalUnknown: j0.criticalUnknown,
      decisionChangingEvidence: j0.decisionChangingEvidence,
      validationPriority: j0.validationPriority,
      questionKind: t0.current.question.kind,
      question: t0.current.question.questionText,
      whyAsking: t0.current.question.whyAsking,
    },
    after: {
      verdictId: j.verdictId,
      stageId: j.stageId,
      headline: j.judgment,
      criticalUnknown: j.criticalUnknown,
      validationPriority: j.validationPriority,
      questionKind: q.kind,
      question: q.questionText,
      whyAsking: q.whyAsking,
      addedClass: u?.addedEvidence[0]?.evidenceClass ?? null,
      addedText: u?.addedEvidence[0]?.text ?? null,
      delta: u?.evidenceStrengthDelta ?? null,
      judgmentChanged: u?.judgmentChanged ?? false,
      cuChanged: u?.criticalUnknownChanged ?? false,
      priorityChanged: u?.validationPriorityChanged ?? false,
      classified: answer ? classifyFounderEvidence(answer) : null,
    },
  };
}

function moved(row: ReturnType<typeof play>) {
  return {
    verdictMoved: row.t0.verdictId !== row.after.verdictId,
    stageMoved: row.t0.stageId !== row.after.stageId,
    cuMoved: row.after.cuChanged,
    priorityMoved: row.after.priorityChanged,
    questionMoved: row.t0.question !== row.after.question,
    sameQuestion: row.t0.question === row.after.question,
  };
}

describe('Founder Decision Value Batch 5 — P1-C DCE promotion boundary', () => {
  it('records Full / Partial / ASSUMPTION promotion on ClinicFlow FitBridge 동네장터', () => {
    const clinic = {
      semanticFull: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicSemanticFull),
      tokenFull: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicTokenFull),
      partialPay: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicPartialPay),
      partialStake: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicPartialStake),
      assumption: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicAssumption),
    };
    const fit = {
      semanticFull: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitSemanticFull),
      tokenFull: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitTokenFull),
      partialPay: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitPartialPay),
      partialStake: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitPartialStake),
      assumption: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitAssumption),
    };
    const local = {
      semanticFull: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localSemanticFull),
      tokenFull: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localTokenFull),
      partialPay: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localPartialPay),
      assumption: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localAssumption),
    };

    const payload = {
      production: '671005f',
      analyzerBaseline: 'c0b9bc3',
      measuredAt: new Date().toISOString(),
      answers: ANSWERS,
      clinicflow: {
        dce: clinic.semanticFull.t0.decisionChangingEvidence,
        paths: Object.fromEntries(
          Object.entries(clinic).map(([id, row]) => [id, { ...row, moved: moved(row) }]),
        ),
      },
      fitbridge: {
        dce: fit.semanticFull.t0.decisionChangingEvidence,
        paths: Object.fromEntries(
          Object.entries(fit).map(([id, row]) => [id, { ...row, moved: moved(row) }]),
        ),
      },
      localSns: {
        dce: local.semanticFull.t0.decisionChangingEvidence,
        paths: Object.fromEntries(
          Object.entries(local).map(([id, row]) => [id, { ...row, moved: moved(row) }]),
        ),
      },
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(clinic.assumption.after.addedClass).not.toBe('VALIDATED');
    expect(fit.assumption.after.addedClass).not.toBe('VALIDATED');
    expect(local.assumption.after.addedClass).not.toBe('VALIDATED');
    expect(clinic.assumption.after.verdictId).not.toBe('viable');
    expect(fit.assumption.after.verdictId).not.toBe('viable');
    expect(clinic.partialPay.after.stageId).not.toBe('S4');
    expect(fit.partialPay.after.stageId).not.toBe('S4');
    expect(clinic.semanticFull.after.question).not.toMatch(/재판매/);
    expect(fit.semanticFull.after.question).not.toMatch(/재판매/);
    expect(local.semanticFull.after.question).not.toMatch(/재판매/);
  });
});
