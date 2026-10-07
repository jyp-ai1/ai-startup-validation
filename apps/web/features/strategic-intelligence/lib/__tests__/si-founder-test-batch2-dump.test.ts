import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifyFounderEvidence } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-test-batch2-acbbf24.json',
);

const SOURCE_PREFIX = 'origin/cursor/si-founder-test-e648:docs/evidence/ALABOM/SI/founder-test-sources';

function sourceOf(name: string): string {
  return execSync(`git show ${SOURCE_PREFIX}/${name}-source.txt`, {
    encoding: 'utf8',
    cwd: resolve(process.cwd(), '../..'),
  });
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>) {
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
    addedClass: u?.addedEvidence[0]?.evidenceClass ?? null,
    addedText: u?.addedEvidence[0]?.text ?? null,
    delta: u?.evidenceStrengthDelta ?? null,
    judgmentChanged: u?.judgmentChanged ?? false,
    cuChanged: u?.criticalUnknownChanged ?? false,
    priorityChanged: u?.validationPriorityChanged ?? false,
  };
}

function play(title: string, document: string, answer?: string) {
  const t0 = resolveSiJourneyIntegration({ title, businessDocument: document });
  if (!answer) return { t0: snap(t0), t1: null as ReturnType<typeof snap> | null };
  const t1 = resolveSiJourneyIntegration({
    title,
    businessDocument: document,
    founderAnswer: answer,
  });
  return { t0: snap(t0), t1: snap(t1), classified: classifyFounderEvidence(answer) };
}

describe('Founder Test Batch 2 — measure only', () => {
  it('records RIDM / LMULM / 주인집 decision-value journeys on Production SHA', () => {
    const ridmDoc = sourceOf('ridm');
    const lmulmDoc = sourceOf('lmulm');
    const juinjipDoc = sourceOf('juinjip');

    const ANSWERS = {
      ridmUnpaid: '아직 유료 고객은 없고, 결제 제안도 하지 않았다.',
      ridmPaid: '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
      lmulmPositive: '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.',
      lmulmNegative: '1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.',
      lmulmPartial: '재구매 2건은 있었으나 재판매 등록은 0건이다.',
      juinjipUnpaid: '양조장 대표에게 제안했지만 아직 한 건도 결제되지 않았다.',
      juinjipPaid: '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.',
    };

    const payload = {
      production: 'acbbf24',
      analyzerBaseline: 'c0b9bc3',
      measuredAt: new Date().toISOString(),
      sourceChars: { ridm: ridmDoc.length, lmulm: lmulmDoc.length, juinjip: juinjipDoc.length },
      ridm: {
        unpaid: play('RIDM AI', ridmDoc, ANSWERS.ridmUnpaid),
        paid: play('RIDM AI', ridmDoc, ANSWERS.ridmPaid),
      },
      lmulm: {
        positive: play('LMULM', lmulmDoc, ANSWERS.lmulmPositive),
        negative: play('LMULM', lmulmDoc, ANSWERS.lmulmNegative),
        partial: play('LMULM', lmulmDoc, ANSWERS.lmulmPartial),
      },
      juinjip: {
        unpaid: play('주인집', juinjipDoc, ANSWERS.juinjipUnpaid),
        paid: play('주인집', juinjipDoc, ANSWERS.juinjipPaid),
      },
      answers: ANSWERS,
      p0: {
        lmulmNegativeRoseToViable:
          play('LMULM', lmulmDoc).t0.verdictId !== 'viable' &&
          play('LMULM', lmulmDoc, ANSWERS.lmulmNegative).t1?.verdictId === 'viable',
        lmulmPartialPromotedS4:
          play('LMULM', lmulmDoc, ANSWERS.lmulmPartial).t1?.stageId === 'S4',
      },
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(payload.sourceChars.ridm).toBeGreaterThan(1000);
    expect(payload.sourceChars.lmulm).toBeGreaterThan(1000);
    expect(payload.sourceChars.juinjip).toBeGreaterThan(1000);
    expect(payload.p0.lmulmNegativeRoseToViable).toBe(false);
    expect(payload.p0.lmulmPartialPromotedS4).toBe(false);
    expect(payload.lmulm.positive.t1?.stageId).toBe('S4');
  });
});
