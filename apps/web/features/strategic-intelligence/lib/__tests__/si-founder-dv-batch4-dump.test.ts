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
  '../../docs/evidence/ALABOM/SI/si-v1-founder-dv-batch4-671005f.json',
);

const ANSWERS = {
  clinicPaid:
    '결제 후보 2곳이 월 구독을 결제했고 no-show가 22%에서 12%로 줄었다.',
  clinicUnpaid: '가장 가까운 병원에 제안했지만 아직 한 건도 결제되지 않았다.',
  fitPaid: '결제 후보 2곳이 위젯을 결제했고 반품률이 38%에서 29%로 줄었다.',
  fitUnpaid: '브랜드 3곳에 제안했지만 아직 한 건도 결제되지 않았다.',
  localPaid: '파일럿 사장 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
  localUnpaid: '파일럿 가게에 제안했지만 아직 한 건도 결제되지 않았다.',
} as const;

function play(title: string, document: string, answer?: string) {
  const view = resolveSiJourneyIntegration({
    title,
    businessDocument: document,
    founderAnswer: answer,
  });
  const j = view.current.judgment;
  const q = view.current.question;
  const u = view.current.update;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    headline: j.judgment,
    whyPossible: j.whyPossible,
    whyFail: j.whyFail,
    strengths: j.strengths,
    risks: j.risks,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    questionKind: q.kind,
    question: q.questionText,
    whyAsking: q.whyAsking,
    evidenceSought: q.evidenceSought,
    addedClass: u?.addedEvidence[0]?.evidenceClass ?? null,
    addedText: u?.addedEvidence[0]?.text ?? null,
    delta: u?.evidenceStrengthDelta ?? null,
    classified: answer ? classifyFounderEvidence(answer) : null,
  };
}

describe('Founder Decision Value Batch 4 — new businesses only', () => {
  it('records ClinicFlow / FitBridge / 동네장터알림 journeys on Production SHA', () => {
    const payload = {
      production: '671005f',
      analyzerBaseline: 'c0b9bc3',
      excludedPriorFounderSet: ['RIDM', '주인집', 'LMULM'],
      measuredAt: new Date().toISOString(),
      answers: ANSWERS,
      clinicflow: {
        t0: play('클리닉플로우', CLINICFLOW_DOCUMENT),
        unpaid: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicUnpaid),
        paid: play('클리닉플로우', CLINICFLOW_DOCUMENT, ANSWERS.clinicPaid),
      },
      fitbridge: {
        t0: play('핏브릿지', FITBRIDGE_DOCUMENT),
        unpaid: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitUnpaid),
        paid: play('핏브릿지', FITBRIDGE_DOCUMENT, ANSWERS.fitPaid),
      },
      localSns: {
        t0: play('동네장터알림', LOCAL_SNS_DOCUMENT),
        unpaid: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localUnpaid),
        paid: play('동네장터알림', LOCAL_SNS_DOCUMENT, ANSWERS.localPaid),
      },
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(payload.clinicflow.t0.question).not.toMatch(/재판매/);
    expect(payload.fitbridge.t0.question).not.toMatch(/재판매/);
    expect(payload.localSns.t0.question).not.toMatch(/재판매/);
    expect(payload.clinicflow.paid.question).not.toMatch(/재판매/);
    expect(payload.fitbridge.paid.question).not.toMatch(/재판매/);
    expect(payload.clinicflow.unpaid.verdictId).not.toBe('viable');
    expect(payload.fitbridge.unpaid.verdictId).not.toBe('viable');
    expect(payload.localSns.unpaid.verdictId).not.toBe('viable');
  });
});
