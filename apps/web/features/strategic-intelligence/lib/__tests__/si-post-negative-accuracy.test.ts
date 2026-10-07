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

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-post-negative-accuracy.json',
);
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
  const t0 = resolveSiJourneyIntegration({ title, businessDocument: document });
  turns.push({ ...snap(t0), evidenceClass: null });
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
      conflict: '실제 재판매는 없었다. 거래도 없다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 재판매·재구매는 없다.',
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 결제는 없다.',
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
      conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
      contradict: '지난번에는 됐다고 했지만 이번에는 아니다. 실제 결제·직무 대체는 없다.',
    };
  }
  return {
    upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
    paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
    conflict: '유료 전환은 없었고 아무도 결제하지 않았다.',
    contradict: `지난번에는 됐다고 했지만 이번에는 아니다. ${stake.noun}는 다시 나빠졌고 실제 결제는 없다.`,
  };
}

function scoreCase(id: CaseId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(t0.kind, t0.criticalUnknown);
  const paidOnly = last(runTurns(input.title, input.documentText, [book.paymentOnly]));
  const upgraded = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const downgraded = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));
  const conflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.conflict]));
  const contradicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.contradict]));

  const failures: PostNegFailure[] = [];
  const upgradedOk = rose(t0, upgraded) || t0.stageId === 'S3';
  const downOk = declined(upgraded, downgraded);
  const conflictOk =
    conflicted.evidenceClass === 'CONFLICT' || declined(upgraded, conflicted);
  const falseConflictOnRepeatZero = t0.kind === 'repeat_loop' && downgraded.evidenceClass === 'CONFLICT';
  const s4Stuck = upgraded.stageId === 'S4' && downgraded.stageId === 'S4';
  const staleCu = upgraded.criticalUnknown === t0.criticalUnknown && rose(t0, upgraded);
  const stalePriority = upgraded.validationPriority === t0.validationPriority && rose(t0, upgraded);
  const genericAfterSpecific =
    (isGenericAsk(upgraded) && /다음 고객|다음 기간/.test(upgraded.criticalUnknown)) ||
    (isGenericAsk(downgraded) && downgraded.criticalUnknown.length > 12);
  const questionUp = questionTracksCuPriority(upgraded);
  const questionDown = questionTracksCuPriority(downgraded);
  const fourDown = founderFour(downgraded);
  const paidPromoted =
    t0.kind === 'paid_conversion' &&
    (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');

  if (!upgradedOk) failures.push('missed_upgrade');
  if (!downOk) failures.push('missed_downgrade');
  if (!conflictOk) failures.push('ignored_conflict');
  if (falseConflictOnRepeatZero) failures.push('false_conflict');
  if (s4Stuck) failures.push('s4_stuck');
  if (staleCu) failures.push('stale_cu');
  if (stalePriority) failures.push('stale_priority');
  if (genericAfterSpecific) failures.push('generic_ask_after_specific_cu');
  if (!genericAfterSpecific && (!questionUp || !questionDown)) failures.push('question_off_cu_priority');
  if (fourDown.leftoverPositive) failures.push('leftover_positive_headline');
  if (!fourDown.readable) failures.push('founder_four_break');
  if (paidPromoted) failures.push('payment_only_promoted');

  const unique = [...new Set(failures)];
  const axes = [
    scoreAxis(
      'judgment',
      upgradedOk && downOk && !s4Stuck ? 'PASS' : 'FAIL',
      `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
      upgradedOk && downOk && !s4Stuck ? undefined : 'missed_downgrade',
    ),
    scoreAxis(
      'evidence',
      conflictOk && !falseConflictOnRepeatZero ? 'PASS' : 'FAIL',
      `conflict class=${conflicted.evidenceClass} neg class=${downgraded.evidenceClass}`,
      conflictOk ? (falseConflictOnRepeatZero ? 'false_conflict' : undefined) : 'ignored_conflict',
    ),
    scoreAxis(
      'state',
      !staleCu || !rose(t0, upgraded) ? 'PASS' : 'FAIL',
      staleCu ? 'CU unchanged after upgrade' : 'CU moved or t0 already promoted',
      staleCu ? 'stale_cu' : undefined,
    ),
    scoreAxis(
      'negative_contradictory',
      downOk && conflictOk ? 'PASS' : 'FAIL',
      `neg ${downgraded.verdictId}/${downgraded.stageId} contradict ${contradicted.verdictId}`,
      downOk && conflictOk ? undefined : 'missed_downgrade',
    ),
    scoreAxis(
      'cu_priority',
      stalePriority && rose(t0, upgraded) ? 'FAIL' : 'PASS',
      stalePriority ? 'Priority stuck after upgrade' : 'Priority moved or held honestly',
      stalePriority && rose(t0, upgraded) ? 'stale_priority' : undefined,
    ),
    scoreAxis(
      'question',
      genericAfterSpecific ? 'PARTIAL' : questionUp && questionDown ? 'PASS' : 'FAIL',
      `up kind=${upgraded.kind} down kind=${downgraded.kind}`,
      genericAfterSpecific
        ? 'generic_ask_after_specific_cu'
        : questionUp && questionDown
          ? undefined
          : 'question_off_cu_priority',
    ),
    scoreAxis(
      'founder_outcome',
      fourDown.readable && !fourDown.leftoverPositive ? 'PASS' : 'FAIL',
      `readable=${fourDown.readable} leftoverPositive=${fourDown.leftoverPositive}`,
      fourDown.leftoverPositive ? 'leftover_positive_headline' : fourDown.readable ? undefined : 'founder_four_break',
    ),
  ];

  return {
    id,
    unnamed: id.startsWith('nameless_'),
    productionSha: PRODUCTION_SHA,
    fixSha: FIX_SHA,
    t0,
    hops: `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
    sequences: {
      payment_only: paidOnly,
      upgrade: upgraded,
      downgrade: downgraded,
      conflict: conflicted,
      contradict: contradicted,
    },
    axes,
    failures: unique,
  };
}

describe('Post-Negative-Judgment Accuracy Batch — measure only', () => {
  it('does not rewrite presenter or question engine', () => {
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records seven axes after the Negative Judgment Fix', () => {
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
          scenarioCount: rows.length * 5,
          axisCounts,
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
    expect(rows.filter((row) => row.unnamed)).toHaveLength(3);
    expect(rows.every((row) => row.axes.length === 7)).toBe(true);
    expect(rows[0]!.axes.map((axis) => axis.id)).toEqual(axisIds);
  });
});
