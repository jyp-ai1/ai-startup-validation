import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  declined,
  namesConflict,
  scoreTransitionAxis,
  staleFulfilledStake,
  type TransitionAxisId,
} from './score-si-judgment-transition';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-judgment-transition.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const CASE_IDS = Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>;
const PRODUCTION_SHA = 'dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2';

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>) {
  const j = view.current.judgment;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    criticalUnknown: j.criticalUnknown,
    validationPriority: j.validationPriority,
    question: view.current.question.questionText,
    kind: view.current.question.kind,
  };
}

function runTurns(title: string, documentText: string, answers: string[]) {
  const turns = [];
  let document = documentText;
  const t0 = resolveSiJourneyIntegration({ title, businessDocument: document });
  turns.push({ answer: null, ...snap(t0) });
  for (const answer of answers) {
    const next = resolveSiJourneyIntegration({
      title,
      businessDocument: document,
      founderAnswer: answer,
    });
    turns.push({ answer, evidenceClass: next.current.update?.addedEvidence[0]?.evidenceClass ?? null, ...snap(next) });
    document = appendFounderEvidenceToDocument(document, answer);
  }
  return { t0: snap(t0), turns };
}

function stakeFromUnknown(cu: string) {
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '18%', to: '9%', worse: '22%' };
  if (/반품/.test(cu)) return { noun: '반품률', from: '32%', to: '20%', worse: '35%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function playbook(id: (typeof CASE_IDS)[number], cu: string) {
  const stake = stakeFromUnknown(cu);
  const paid = pickSiIntegrationAnswer('paid_conversion', 'validated');
  if (id === 'lmulm') {
    return {
      upgrade: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 재판매·재구매는 없다.',
    };
  }
  if (id === 'juinjip') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 결제는 없다.',
    };
  }
  if (id === 'ridm') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
      conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 결제·직무 대체는 없다.',
    };
  }
  return {
    upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
    negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
    conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
    contradict: `지난번에는 됐다고 했지만 이번에는 아니다. ${stake.noun}는 다시 나빠졌고 실제 결제는 없다.`,
    worseningAsImproved: `${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
  };
}

function scoreCase(id: (typeof CASE_IDS)[number]) {
  const fixture = getSiCalibrationCase(id);
  const t0view = resolveSiJourneyIntegration({
    title: fixture.title,
    businessDocument: fixture.documentText,
  });
  const t0 = snap(t0view);
  const book = playbook(id, t0.criticalUnknown);

  const upgraded = runTurns(fixture.title, fixture.documentText, [book.upgrade]);
  const downgraded = runTurns(fixture.title, fixture.documentText, [book.upgrade, book.negative]);
  const conflicted = runTurns(fixture.title, fixture.documentText, [book.upgrade, book.conflict]);
  const contradicted = runTurns(fixture.title, fixture.documentText, [book.upgrade, book.contradict]);
  const worsenedOnly =
    'worseningAsImproved' in book
      ? runTurns(fixture.title, fixture.documentText, [book.upgrade, book.worseningAsImproved])
      : null;

  const afterUpgrade = upgraded.turns[1]!;
  const afterDown = downgraded.turns[2]!;
  const afterConflict = conflicted.turns[2]!;
  const afterContradict = contradicted.turns[2]!;

  const consistency =
    t0.judgment.startsWith('현재 판단:') &&
    t0.criticalUnknown.length > 12 &&
    t0.validationPriority.length > 8 &&
    t0.question.length > 8;
  const inconsistent =
    t0.verdictId === 'viable' &&
    id !== 'lmulm' &&
    /확정할 수 없/.test(t0.criticalUnknown);

  const downMoved = declined(afterUpgrade, afterDown);
  const conflictMoved = declined(afterUpgrade, afterConflict) || namesConflict(afterConflict.criticalUnknown);
  const contradictMoved =
    declined(afterUpgrade, afterContradict) || namesConflict(afterContradict.criticalUnknown);
  const leftoverStake = staleFulfilledStake(
    `${afterUpgrade.criticalUnknown} ${afterUpgrade.validationPriority} ${afterUpgrade.question}`,
  );
  const leftoverSameUnknown = afterUpgrade.criticalUnknown === t0.criticalUnknown;
  const superseded = !leftoverStake && !leftoverSameUnknown;
  const s4AfterOne = afterUpgrade.stageId === 'S4';
  const s4Unexpected = (id === 'clinicflow' || id === 'fitbridge' || id === 'juinjip' || id === 'ridm') && s4AfterOne;
  const s4SingleRepeat = id === 'lmulm' && s4AfterOne;
  const worseStillPromoted = Boolean(
    worsenedOnly && !declined(afterUpgrade, worsenedOnly.turns[2]!) && worsenedOnly.turns[2]!.stageId === 'S3',
  );

  const axes = [
    scoreTransitionAxis(
      'stage_consistency',
      !consistency || inconsistent ? 'FAIL' : 'PASS',
      `${t0.verdictId}/${t0.stageId}`,
      inconsistent ? 'state_inconsistent' : undefined,
    ),
    scoreTransitionAxis(
      'judgment_downgrade',
      downMoved ? 'PASS' : 'FAIL',
      `${afterUpgrade.stageId}/${afterUpgrade.verdictId} → ${afterDown.stageId}/${afterDown.verdictId}`,
      downMoved ? undefined : 'missed_downgrade',
    ),
    scoreTransitionAxis(
      'evidence_conflict',
      conflictMoved ? 'PASS' : 'FAIL',
      `${afterUpgrade.verdictId} → ${afterConflict.verdictId}`,
      conflictMoved ? undefined : 'ignored_conflict',
    ),
    scoreTransitionAxis(
      'evidence_supersession',
      superseded ? 'PASS' : 'FAIL',
      superseded
        ? 'CU replaced after VALIDATED upgrade'
        : leftoverSameUnknown
          ? 't0 CU unchanged after VALIDATED upgrade'
          : 'Fulfilled-stake leftover after upgrade',
      superseded ? undefined : 'stale_after_supersession',
    ),
    scoreTransitionAxis(
      's4_overpromote',
      s4Unexpected ? 'FAIL' : s4SingleRepeat ? 'PARTIAL' : 'PASS',
      `upgrade stage ${afterUpgrade.stageId}`,
      s4Unexpected || s4SingleRepeat ? 's4_on_single_repeat' : undefined,
    ),
    scoreTransitionAxis(
      'negative_evidence',
      downMoved ? 'PASS' : 'FAIL',
      afterDown.criticalUnknown.slice(0, 80),
      downMoved ? undefined : 'ignored_negative',
    ),
    scoreTransitionAxis(
      'contradictory_answer',
      contradictMoved ? 'PASS' : 'FAIL',
      `${afterUpgrade.verdictId} → ${afterContradict.verdictId}`,
      contradictMoved ? undefined : 'ignored_contradiction',
    ),
  ];

  const failures = axes.map((axis) => axis.failure).filter((item): item is NonNullable<typeof item> => Boolean(item));
  if (worseStillPromoted) failures.push('worsening_as_improved');

  return {
    id,
    productionSha: PRODUCTION_SHA,
    t0,
    sequences: {
      upgrade: upgraded.turns,
      downgrade: downgraded.turns,
      conflict: conflicted.turns,
      contradict: contradicted.turns,
      worsen: worsenedOnly?.turns ?? null,
    },
    axes,
    failures,
  };
}

describe('S.I. Judgment transition discovery — measure only', () => {
  it('does not rewrite the engine, presenter, or question engine', () => {
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).toMatch(/function dceStakeOpen/);
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('records five-business transition axes without opening a fix', () => {
    const rows = CASE_IDS.map((id) => scoreCase(id));
    const axisIds = [
      'stage_consistency',
      'judgment_downgrade',
      'evidence_conflict',
      'evidence_supersession',
      's4_overpromote',
      'negative_evidence',
      'contradictory_answer',
    ] as const;
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
    const failures = [...new Set(rows.flatMap((row) => row.failures))].sort();

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify({ productionSha: PRODUCTION_SHA, axisCounts, failures, rows }, null, 2)}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(5);
    expect(rows.every((row) => row.axes)).toBeTruthy();
    expect(rows.every((row) => row.axes.length === 7)).toBe(true);
    expect(rows.every((row) => row.productionSha === PRODUCTION_SHA)).toBe(true);
    expect(rows[0]!.axes.map((axis) => axis.id as TransitionAxisId)).toEqual([...axisIds]);
    expect(axisCounts.judgment_downgrade.FAIL).toBe(5);
    expect(axisCounts.evidence_conflict.FAIL).toBe(5);
    expect(axisCounts.contradictory_answer.FAIL).toBe(5);
    expect(axisCounts.stage_consistency.PASS).toBe(5);
  });
});
