import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { analyzeStrategicIntelligence } from '../analyze-strategic-intelligence';
import { classifyFounderEvidence } from '../classify-founder-evidence';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-test-batch3-acbbf24.json',
);
const PREFIX = 'origin/cursor/si-founder-test-e648:docs/evidence/ALABOM/SI/founder-test-sources';

function sourceOf(name: string): string {
  return execSync(`git show ${PREFIX}/${name}-source.txt`, {
    encoding: 'utf8',
    cwd: resolve(process.cwd(), '../..'),
  });
}

function launchishLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => /출시|런칭|launch|앱/i.test(line));
}

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

describe('Founder Test Batch 3 — P1 pattern confirmation', () => {
  it('records paid→resale, 주인집 launch fidelity, and LMULM P0 sanity', () => {
    const ridm = sourceOf('ridm');
    const juinjip = sourceOf('juinjip');
    const lmulm = sourceOf('lmulm');
    const paid = '결제 후보 2명이 월 구독을 결제했고 유료 전환 1건이 발생했다.';
    const t0Juinjip = analyzeStrategicIntelligence({ title: '주인집', documentText: juinjip });

    const payload = {
      production: 'acbbf24',
      analyzerBaseline: 'c0b9bc3',
      measuredAt: new Date().toISOString(),
      paidAnswer: paid,
      ridm: {
        sourceLaunchish: launchishLines(ridm),
        t0: play('RIDM AI', ridm),
        afterPaid: play('RIDM AI', ridm, paid),
      },
      juinjip: {
        sourceLaunchish: launchishLines(juinjip),
        sourceBusinessTypeLine: juinjip
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .find((line) => /예비/.test(line)) ?? null,
        sourceScheduleLaunchLine: juinjip
          .split('\n')
          .map((line) => line.replace(/\s+/g, ' ').trim())
          .find((line) => /런칭/.test(line)) ?? null,
        t0Strengths: t0Juinjip.strengths,
        t0LaunchInStrengths: t0Juinjip.strengths.some((s) => /출시/.test(s)),
        t0: play('주인집', juinjip),
        afterPaid: play('주인집', juinjip, paid),
      },
      lmulm: {
        t0: play('LMULM', lmulm),
        positive: play(
          'LMULM',
          lmulm,
          '최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.',
        ),
        negative: play('LMULM', lmulm, '1차 판매는 있었지만 재판매 등록 0건, 재구매 0건이다.'),
        partial: play('LMULM', lmulm, '재구매 2건은 있었으나 재판매 등록은 0건이다.'),
      },
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    expect(payload.ridm.afterPaid.questionKind).toBe('repeat_loop');
    expect(payload.juinjip.afterPaid.questionKind).toBe('repeat_loop');
    expect(payload.juinjip.t0LaunchInStrengths).toBe(true);
    expect(payload.lmulm.positive.stageId).toBe('S4');
    expect(payload.lmulm.negative.verdictId).not.toBe('viable');
    expect(payload.lmulm.negative.stageId).toBe('S3');
    expect(payload.lmulm.partial.stageId).not.toBe('S4');
  });
});
