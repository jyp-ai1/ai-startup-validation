import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { declined, founderFour, isGenericAsk, rose } from './score-si-post-negative-batch';
import { isNextUnresolvedCu } from './score-si-question-alignment-holdout';
import {
  hopLabel,
  rollupAxis,
  scoreClosureAxes,
  type ClosureAxisId,
  type ClosureSnap,
} from './score-si-accuracy-closure';

const SNAPSHOT_PATH = resolve(process.cwd(), '../../docs/evidence/ALABOM/SI/si-v1-accuracy-closure.json');
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);
const ASK_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../decide-si-validation-ask.ts'),
  'utf8',
);

const PRODUCTION_SHA = 'dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2';
const ALIGNMENT_FIX_SHA = '6926d6ffc108f677fcc274ca4523ebfb71ac2351';

const UNNAMED = {
  unnamed_rx_omit: {
    documentText: `동네 약국은 처방 출고 전 검수에서 누락이 31%에 달합니다.
기존 대안은 약국 POS 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_pack_load: {
    documentText: `풀필먼트 패킹 라인은 피크 시 티켓 부하가 12%에서 멈추지 않습니다.
기존 대안은 WMS 기본 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_onboard_churn: {
    documentText: `B2B 협업툴 온보딩은 첫 달 이탈이 47%에 달합니다.
기존 대안은 CRM 기본 알림입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_gadget_return: {
    documentText: `소형 가전 D2C는 사이즈 가이드 부재로 반품률이 9%입니다.
기존 대안은 범용 사이즈 차트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_shift_notes: {
    documentText: `야간 물류 감독은 인수인계를 수기로 남겨 반복 확인이 어렵습니다.
기존 대안은 범용 메신저입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_brew_split: {
    documentText: `지역 양조 체험은 관광객이 쓰지만 마케팅비는 양조장 대표가 낼 것으로 봅니다.
사용자는 체험 손님이고, 실제 비용을 내는 구매자는 대표가 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
대표가 마케팅비를 낼 의향인지도 확인되지 않았습니다.
기존 대안은 직접 인스타그램에 올리는 방식입니다.`,
  },
} as const;

type ClosureId = keyof typeof SI_CALIBRATION_CASES | keyof typeof UNNAMED;

function caseInput(id: ClosureId): { title?: string; documentText: string } {
  if (id in UNNAMED) return { title: undefined, documentText: UNNAMED[id as keyof typeof UNNAMED].documentText };
  const fixture = getSiCalibrationCase(id as keyof typeof SI_CALIBRATION_CASES);
  return { title: fixture.title, documentText: fixture.documentText };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): ClosureSnap {
  const j = view.current.judgment;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    question: view.current.question.questionText,
    kind: view.current.question.kind,
    evidenceClass: view.current.update?.addedEvidence[0]?.evidenceClass ?? null,
    whyAsking: view.current.question.whyAsking,
  };
}

function runTurns(title: string | undefined, documentText: string, answers: string[]) {
  const turns: ClosureSnap[] = [];
  let document = documentText;
  turns.push({
    ...snap(resolveSiJourneyIntegration({ title, businessDocument: document })),
    evidenceClass: null,
  });
  for (const answer of answers) {
    const next = resolveSiJourneyIntegration({ title, businessDocument: document, founderAnswer: answer });
    turns.push(snap(next));
    document = appendFounderEvidenceToDocument(document, answer);
  }
  return turns;
}

function last(turns: ClosureSnap[]): ClosureSnap {
  return turns[turns.length - 1]!;
}

function stakeFromUnknown(cu: string) {
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '22%', to: '11%', worse: '26%' };
  if (/반품/.test(cu)) return { noun: '반품률', from: '9%', to: '4%', worse: '14%' };
  if (/누락/.test(cu)) return { noun: '누락', from: '31%', to: '14%', worse: '36%' };
  if (/부하/.test(cu)) return { noun: '부하', from: '12%', to: '5%', worse: '18%' };
  if (/이탈/.test(cu)) return { noun: '이탈', from: '47%', to: '21%', worse: '51%' };
  if (/불일치/.test(cu)) return { noun: '불일치', from: '4%', to: '1%', worse: '7%' };
  if (/미스매치/.test(cu)) return { noun: '미스매치', from: '22%', to: '10%', worse: '25%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function clinicStake(id: ClosureId, cu: string) {
  if (id === 'clinicflow') return { noun: 'no-show', from: '22%', to: '12%', worse: '24%' };
  if (id === 'fitbridge') return { noun: '반품률', from: '38%', to: '29%', worse: '41%' };
  return stakeFromUnknown(cu);
}

function dceStakeOpenCu(cu: string): boolean {
  return /(no-show|노쇼|반품|누락|불일치|미스매치|이탈|부하|지불만|전후)/.test(cu);
}

function playbook(id: ClosureId, kind: string, cu: string) {
  const stake = clinicStake(id, cu);
  if (kind === 'repeat_loop') {
    return {
      upgrade: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      directConflict: '실제 재판매는 발생하지 않았다.',
      notConflict: '재구매는 0건이다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'segment_proof') {
    return {
      upgrade: pickSiIntegrationAnswer('segment_proof', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '지목한 고객은 쓰지 않았고 아무도 지불하지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
      dceTwoTwo: false,
    };
  }
  if (dceStakeOpenCu(cu)) {
    return {
      upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
      dceTwoTwo: true,
    };
  }
  return {
    upgrade: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    s4: pickSiIntegrationAnswer('repeat_loop', 'validated'),
    negative: '유료 2곳이 해지했고 아무도 결제하지 않았다.',
    directConflict: '실제로 결제한 고객은 없었다.',
    notConflict: '재구매는 0건이다.',
    dceTwoTwo: false,
  };
}

export function closureCaseIds(): ClosureId[] {
  return [
    ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
    ...(Object.keys(UNNAMED) as Array<keyof typeof UNNAMED>),
  ];
}

export function scoreCase(id: ClosureId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(id, t0.kind, t0.criticalUnknown);
  const paidOnly = last(runTurns(input.title, input.documentText, [book.paymentOnly]));
  const upgraded = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const s4 = last(runTurns(input.title, input.documentText, [book.upgrade, book.s4]));
  const downgraded = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));
  const conflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.directConflict]));
  const notConflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.notConflict]));
  const fullHop = last(runTurns(input.title, input.documentText, [book.upgrade, book.directConflict]));

  const scored = scoreClosureAxes({
    t0,
    paidOnly,
    upgraded,
    s4,
    downgraded,
    conflicted,
    notConflicted,
    dceTwoTwo: book.dceTwoTwo,
  });

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    kind: t0.kind,
    dceTwoTwo: book.dceTwoTwo,
    hops: {
      t0: t0.stageId,
      upgrade: hopLabel(t0, upgraded),
      s4: hopLabel(upgraded, s4),
      down: hopLabel(upgraded, downgraded),
      conflict: hopLabel(upgraded, conflicted),
      full: `${t0.stageId}→${upgraded.stageId}→${fullHop.stageId}`,
    },
    paymentOnly: {
      stageId: paidOnly.stageId,
      offS3: paidOnly.stageId !== 'S3' && paidOnly.stageId !== 'S4',
    },
    promotion: {
      cu: upgraded.criticalUnknown,
      priority: upgraded.validationPriority,
      nextUnknownCu: isNextUnresolvedCu(upgraded.criticalUnknown),
      kind: upgraded.kind,
      question: upgraded.question,
      genericAfterNext: isNextUnresolvedCu(upgraded.criticalUnknown) && isGenericAsk(upgraded),
    },
    s4: { stageId: s4.stageId, cu: s4.criticalUnknown, kind: s4.kind, question: s4.question },
    conflict: {
      class: conflicted.evidenceClass,
      stageId: conflicted.stageId,
      cu: conflicted.criticalUnknown,
      kind: conflicted.kind,
    },
    notConflict: {
      class: notConflicted.evidenceClass,
      stageId: notConflicted.stageId,
      promoted: rose(upgraded, notConflicted),
    },
    downgrade: {
      declined: declined(upgraded, downgraded),
      leftoverPositive: founderFour(downgraded).leftoverPositive,
      kind: downgraded.kind,
    },
    axes: scored.axes,
    failures: scored.failures,
  };
}

describe('S.I. V1 Accuracy Closure — fresh holdout', () => {
  it('does not rewrite analyzer, presenter, ask kind, persist SoT, or brand-branch', () => {
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(PRESENTER_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records the nine-axis taxonomy on calibration plus fresh unnamed holdout', () => {
    const rows = closureCaseIds().map((id) => scoreCase(id));
    const axisIds: ClosureAxisId[] = [
      'judgment',
      'evidence',
      'state',
      'negative',
      'conflict',
      'cu',
      'priority',
      'question',
      'founder_outcome',
    ];
    const taxonomy = Object.fromEntries(
      axisIds.map((id) => [
        id,
        rollupAxis(rows.map((row) => row.axes.find((axis) => axis.id === id)?.score ?? 'FAIL')),
      ]),
    );
    const axisCounts = Object.fromEntries(
      axisIds.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'PASS').length,
          PARTIAL: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'FAIL').length,
        },
      ]),
    );
    const failureCounts: Record<string, number> = {};
    for (const row of rows) {
      for (const failure of row.failures) {
        failureCounts[failure] = (failureCounts[failure] ?? 0) + 1;
      }
    }
    const hops = {
      s0ToS3: rows.filter((row) => row.hops.upgrade.startsWith('S0→S3') || row.hops.upgrade.startsWith('S0→S4')).length,
      s1ToS3: rows.filter((row) => row.hops.upgrade.startsWith('S1→S3')).length,
      s3ToS4: rows.filter((row) => row.hops.s4 === 'S3→S4' || row.hops.upgrade === 'S3→S4').length,
      s3Down: rows.filter((row) => /^S3→S[012]/.test(row.hops.down)).length,
      s4ToS3: rows.filter((row) => row.hops.down === 'S4→S3' || row.conflict.stageId === 'S3' && row.s4.stageId === 'S4').length,
    };

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          alignmentFixSha: ALIGNMENT_FIX_SHA,
          scenarioCount: rows.length,
          taxonomy,
          axisCounts,
          failureCounts,
          hops,
          regression: {
            paymentOnlyOffS3: rows.filter((row) => row.dceTwoTwo).every((row) => row.paymentOnly.offS3),
            leftoverPositive: rows.filter((row) => row.downgrade.leftoverPositive).length,
            unnamed: rows.filter((row) => row.unnamed).length,
            calibration: rows.filter((row) => !row.unnamed).length,
          },
          rows: rows.map((row) => ({
            id: row.id,
            unnamed: row.unnamed,
            kind: row.kind,
            hops: row.hops,
            axes: row.axes,
            failures: row.failures,
            promotion: row.promotion,
            paymentOnly: row.paymentOnly,
            s4: row.s4,
            conflict: row.conflict,
            notConflict: row.notConflict,
            downgrade: row.downgrade,
          })),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(11);
    expect(rows.filter((row) => row.unnamed)).toHaveLength(6);
    expect(rows.filter((row) => !row.unnamed)).toHaveLength(5);
    expect(rows[0]!.axes.map((axis) => axis.id)).toEqual(axisIds);
    expect(rows.every((row) => row.downgrade.leftoverPositive === false)).toBe(true);
    expect(rows.filter((row) => row.dceTwoTwo).every((row) => row.paymentOnly.offS3)).toBe(true);
    expect(axisCounts.judgment.FAIL).toBe(0);
    expect(axisCounts.evidence.FAIL).toBe(0);
    expect(axisCounts.state.FAIL).toBe(0);
    expect(axisCounts.negative.FAIL).toBe(0);
    expect(axisCounts.conflict.FAIL).toBe(0);
    expect(axisCounts.cu.FAIL).toBe(0);
    expect(axisCounts.priority.FAIL).toBe(0);
    expect(axisCounts.question.FAIL).toBe(0);
    expect(axisCounts.founder_outcome.FAIL).toBe(0);
    expect(hops.s1ToS3).toBeGreaterThan(0);
    expect(hops.s3ToS4).toBeGreaterThan(0);
    expect(hops.s3Down).toBeGreaterThan(0);
  });
});
