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
  founderFour,
  isGenericAsk,
  questionTracksCuPriority,
  rose,
  scoreAxis,
  type PostNegAxisId,
  type PostNegFailure,
  type PostNegSnap,
} from './score-si-post-negative-batch';

const SNAPSHOT_PATH = resolve(process.cwd(), '../../docs/evidence/ALABOM/SI/si-v1-accuracy-batch-2.json');
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const PRODUCTION_SHA = 'dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2';
const FIX_SHA = '4b2aa21fc1cca089357e59cfcbeda327d3af2846';

const NAMELESS = {
  nameless_noshow: {
    title: undefined as string | undefined,
    documentText: `5~20인 병의원은 전화 예약으로 no-show가 18%에 달합니다.
기존 대안은 EMR 기본 알림과 범용 예약앱입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  nameless_returns: {
    title: undefined as string | undefined,
    documentText: `D2C 의류 브랜드는 사이즈 불일치로 반품률 32%를 겪습니다.
기존 대안은 True Fit 같은 글로벌 솔루션입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  nameless_churn: {
    title: undefined as string | undefined,
    documentText: `B2B 온보딩 팀은 첫 주 이탈이 25%에 달합니다.
기존 대안은 CRM 기본 알림과 범용 온보딩툴입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
} as const;

type CaseId = keyof typeof SI_CALIBRATION_CASES | keyof typeof NAMELESS;
type Batch2Failure =
  | PostNegFailure
  | 'stale_cu_after_promotion'
  | 'stale_priority_after_promotion'
  | 'ignored_direct_conflict'
  | 'false_conflict_on_repeat_zero'
  | 'repeat_zero_promoted'
  | 'missed_negative_regression';

function caseInput(id: CaseId): { title?: string; documentText: string } {
  if (id in NAMELESS) return NAMELESS[id as keyof typeof NAMELESS];
  const fixture = getSiCalibrationCase(id as keyof typeof SI_CALIBRATION_CASES);
  return { title: fixture.title, documentText: fixture.documentText };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): PostNegSnap {
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
  };
}

function runTurns(title: string | undefined, documentText: string, answers: string[]) {
  const turns: PostNegSnap[] = [];
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

function last(turns: PostNegSnap[]): PostNegSnap {
  return turns[turns.length - 1]!;
}

function stakeFromUnknown(cu: string) {
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '18%', to: '9%', worse: '22%' };
  if (/반품/.test(cu)) return { noun: '반품률', from: '32%', to: '20%', worse: '35%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function playbook(kind: string, cu: string) {
  const stake = stakeFromUnknown(cu);
  if (kind === 'repeat_loop') {
    return {
      upgrade: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      directConflict: '실제 재판매는 발생하지 않았다.',
      notConflict: '재구매는 0건이다.',
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      notConflict: '재구매는 0건이다.',
    };
  }
  return {
    upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
    paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
    directConflict: '실제로 결제한 고객은 없었다.',
    notConflict: '재구매는 0건이다.',
  };
}

function isNextUnknown(text: string): boolean {
  return /다음 고객|다음 기간/.test(text);
}

function scoreCase(id: CaseId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(t0.kind, t0.criticalUnknown);
  const paidOnly = last(runTurns(input.title, input.documentText, [book.paymentOnly]));
  const upgraded = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const downgraded = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));
  const conflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.directConflict]));
  const notConflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.notConflict]));

  const failures: Batch2Failure[] = [];
  const upgradedOk = rose(t0, upgraded) || t0.stageId === 'S3';
  const downOk = declined(upgraded, downgraded);
  const cuMoved = upgraded.criticalUnknown !== t0.criticalUnknown;
  const priorityMoved = upgraded.validationPriority !== t0.validationPriority;
  const nextCu = isNextUnknown(upgraded.criticalUnknown);
  const genericAfterNext = nextCu && isGenericAsk(upgraded);
  const questionAfterUp = questionTracksCuPriority(upgraded);
  const questionAfterDown = questionTracksCuPriority(downgraded) && !isGenericAsk(downgraded);
  const conflictLabeled = conflicted.evidenceClass === 'CONFLICT';
  const conflictRejudged = declined(upgraded, conflicted);
  const conflictCuMoved = conflicted.criticalUnknown !== upgraded.criticalUnknown;
  const conflictPriorityMoved = conflicted.validationPriority !== upgraded.validationPriority;
  const falseConflict = notConflicted.evidenceClass === 'CONFLICT';
  const repeatZeroPromoted = rose(upgraded, notConflicted);
  const fourDown = founderFour(downgraded);
  const fourConflict = founderFour(conflicted);
  const paidPromoted =
    t0.kind === 'paid_conversion' &&
    (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');
  const staleCu = rose(t0, upgraded) && !cuMoved;
  const stalePriority = rose(t0, upgraded) && !priorityMoved;

  if (!upgradedOk) failures.push('missed_upgrade');
  if (!downOk) failures.push('missed_negative_regression');
  if (staleCu) failures.push('stale_cu_after_promotion');
  if (stalePriority) failures.push('stale_priority_after_promotion');
  if (genericAfterNext) failures.push('generic_ask_after_specific_cu');
  if (!conflictLabeled) failures.push('ignored_direct_conflict');
  if (falseConflict) failures.push('false_conflict_on_repeat_zero');
  if (repeatZeroPromoted) failures.push('repeat_zero_promoted');
  if (fourDown.leftoverPositive) failures.push('leftover_positive_headline');
  if (paidPromoted) failures.push('payment_only_promoted');

  const axes = [
    scoreAxis(
      'judgment',
      upgradedOk && downOk ? 'PASS' : 'FAIL',
      `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
      upgradedOk && downOk ? undefined : 'missed_downgrade',
    ),
    scoreAxis(
      'evidence',
      conflictLabeled && !falseConflict ? 'PASS' : 'FAIL',
      `direct=${conflicted.evidenceClass} repeat-zero=${notConflicted.evidenceClass}`,
      conflictLabeled ? (falseConflict ? 'false_conflict' : undefined) : ('ignored_conflict' as PostNegFailure),
    ),
    scoreAxis(
      'state',
      staleCu ? 'FAIL' : 'PASS',
      staleCu ? 'CU unchanged after positive promotion' : 'CU moved or t0 already promoted',
      staleCu ? 'stale_cu' : undefined,
    ),
    scoreAxis(
      'negative_contradictory',
      conflictLabeled && conflictRejudged ? 'PASS' : conflictRejudged || conflictLabeled ? 'PARTIAL' : 'FAIL',
      `conflict ${upgraded.stageId}→${conflicted.stageId} class=${conflicted.evidenceClass}`,
      conflictLabeled ? undefined : 'ignored_conflict',
    ),
    scoreAxis(
      'cu_priority',
      staleCu || stalePriority ? 'FAIL' : 'PASS',
      `cuMoved=${cuMoved} priorityMoved=${priorityMoved}`,
      staleCu ? 'stale_cu' : stalePriority ? 'stale_priority' : undefined,
    ),
    scoreAxis(
      'question',
      genericAfterNext ? 'PARTIAL' : questionAfterUp && questionAfterDown ? 'PASS' : 'FAIL',
      `up=${upgraded.kind} down=${downgraded.kind} conflict=${conflicted.kind}`,
      genericAfterNext ? 'generic_ask_after_specific_cu' : undefined,
    ),
    scoreAxis(
      'founder_outcome',
      fourDown.readable && !fourDown.leftoverPositive ? 'PASS' : 'FAIL',
      `down leftover=${fourDown.leftoverPositive} conflict leftover=${fourConflict.leftoverPositive}`,
      fourDown.leftoverPositive ? 'leftover_positive_headline' : undefined,
    ),
  ];

  const positivePromotion =
    rose(t0, upgraded) && cuMoved && priorityMoved
      ? genericAfterNext
        ? 'PARTIAL'
        : 'PASS'
      : rose(t0, upgraded)
        ? 'FAIL'
        : upgradedOk
          ? 'PASS'
          : 'FAIL';
  const conflict =
    conflictLabeled && conflictRejudged && !falseConflict
      ? 'PASS'
      : conflictRejudged && !falseConflict
        ? 'PARTIAL'
        : 'FAIL';
  const regression = downOk && !fourDown.leftoverPositive && !paidPromoted ? 'PASS' : 'FAIL';

  return {
    id,
    unnamed: id.startsWith('nameless_'),
    kind: t0.kind,
    dceTwoTwo: t0.kind === 'paid_conversion',
    hops: `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
    paymentOnly: {
      stageId: paidOnly.stageId,
      verdictId: paidOnly.verdictId,
      offS3: paidOnly.stageId !== 'S3' && paidOnly.stageId !== 'S4',
    },
    promotion: {
      cuMoved,
      priorityMoved,
      nextUnknownCu: nextCu,
      t0Cu: t0.criticalUnknown,
      upgradedCu: upgraded.criticalUnknown,
      questionKind: upgraded.kind,
      question: upgraded.question,
      genericAfterNext,
      questionTracks: questionAfterUp,
    },
    conflict: {
      stimulus: book.directConflict,
      class: conflicted.evidenceClass,
      stage: `${upgraded.stageId}→${conflicted.stageId}`,
      verdict: `${upgraded.verdictId}→${conflicted.verdictId}`,
      rejudged: conflictRejudged,
      promoted: rose(upgraded, conflicted),
      cuMoved: conflictCuMoved,
      priorityMoved: conflictPriorityMoved,
      cu: conflicted.criticalUnknown,
      questionKind: conflicted.kind,
      question: conflicted.question,
    },
    notConflict: {
      stimulus: book.notConflict,
      class: notConflicted.evidenceClass,
      stage: `${upgraded.stageId}→${notConflicted.stageId}`,
      promoted: repeatZeroPromoted,
    },
    downgrade: {
      questionKind: downgraded.kind,
      questionTracks: questionAfterDown,
      leftoverPositive: fourDown.leftoverPositive,
      question: downgraded.question,
    },
    focus: {
      positive_promotion: positivePromotion,
      conflict,
      regression,
    },
    axes,
    failures: [...new Set(failures)],
  };
}

describe('S.I. Accuracy Batch #2 — measure only', () => {
  it('does not rewrite the engine, presenter, or question engine', () => {
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records positive promotion and direct-conflict chains without opening a fix', () => {
    const caseIds: CaseId[] = [
      ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
      ...(Object.keys(NAMELESS) as Array<keyof typeof NAMELESS>),
    ];
    const rows = caseIds.map((id) => scoreCase(id));
    const axisIds: PostNegAxisId[] = [
      'judgment',
      'evidence',
      'state',
      'negative_contradictory',
      'cu_priority',
      'question',
      'founder_outcome',
    ];
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
    const focusIds = ['positive_promotion', 'conflict', 'regression'] as const;
    const focusCounts = Object.fromEntries(
      focusIds.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.focus[id] === 'PASS').length,
          PARTIAL: rows.filter((row) => row.focus[id] === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.focus[id] === 'FAIL').length,
        },
      ]),
    );
    const failureCounts: Record<string, number> = {};
    for (const row of rows) {
      for (const failure of row.failures) {
        failureCounts[failure] = (failureCounts[failure] ?? 0) + 1;
      }
    }
    const repeated = Object.entries(failureCounts)
      .filter(([, count]) => count >= 3)
      .map(([id]) => id)
      .sort();
    const oneOff = Object.entries(failureCounts)
      .filter(([, count]) => count < 3)
      .map(([id]) => id)
      .sort();

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          fixSha: FIX_SHA,
          scenarioCount: rows.length * 6,
          axisCounts,
          focusCounts,
          failureCounts,
          repeated,
          oneOff,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(8);
    expect(rows.filter((row) => row.dceTwoTwo)).toHaveLength(5);
    expect(rows.filter((row) => row.unnamed)).toHaveLength(3);
    expect(rows.every((row) => row.axes.length === 7)).toBe(true);
    expect(rows[0]!.axes.map((axis) => axis.id)).toEqual(axisIds);
  });
});
