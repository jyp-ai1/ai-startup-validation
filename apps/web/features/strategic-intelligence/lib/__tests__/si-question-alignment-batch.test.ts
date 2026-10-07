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
  type PostNegSnap,
} from './score-si-post-negative-batch';
import {
  isNextUnresolvedCu,
  questionReflectsCu,
  scoreQaAxis,
  stakeWeavedOffCu,
  type QaAxisId,
  type QaFailure,
} from './score-si-question-alignment-batch';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-question-alignment-batch.json',
);
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
const FIX_SHA = '30504b71950a61fc767d94a4bb56d415268f33cd';

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
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    };
  }
  return {
    upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
    paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
  };
}

function scoreCase(id: CaseId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(t0.kind, t0.criticalUnknown);
  const paidOnly = last(runTurns(input.title, input.documentText, [book.paymentOnly]));
  const upgraded = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const downgraded = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));

  const failures: QaFailure[] = [];
  const cuMoved = upgraded.criticalUnknown !== t0.criticalUnknown;
  const priorityMoved = upgraded.validationPriority !== t0.validationPriority;
  const nextCu = isNextUnresolvedCu(upgraded.criticalUnknown);
  const genericAfterNext = nextCu && isGenericAsk(upgraded);
  const binds = questionReflectsCu(upgraded);
  const downBinds = questionTracksCuPriority(downgraded) && !isGenericAsk(downgraded);
  const downOk = declined(upgraded, downgraded);
  const fourDown = founderFour(downgraded);
  const paidPromoted =
    t0.kind === 'paid_conversion' &&
    (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');

  if (rose(t0, upgraded) && !cuMoved) failures.push('stale_cu_after_dce');
  if (upgraded.criticalUnknown.trim().length < 12) failures.push('next_cu_empty');
  if (genericAfterNext) failures.push('generic_ask_after_specific_cu');
  else if (stakeWeavedOffCu(upgraded)) failures.push('stake_weave_off_cu');
  else if (!binds) failures.push('question_off_cu_priority');
  if (!downBinds) failures.push('generic_after_downgrade');

  const axes = [
    scoreQaAxis(
      'cu_resolved',
      rose(t0, upgraded) && !cuMoved ? 'FAIL' : 'PASS',
      cuMoved ? 'CU moved after VALIDATED DCE' : 'CU held (already promoted or unresolved)',
      rose(t0, upgraded) && !cuMoved ? 'stale_cu_after_dce' : null,
    ),
    scoreQaAxis(
      'next_cu_specific',
      upgraded.criticalUnknown.length > 12 ? 'PASS' : 'FAIL',
      nextCu ? 'next unresolved CU is 다음 고객/기간' : upgraded.criticalUnknown.slice(0, 48),
      upgraded.criticalUnknown.length > 12 ? null : 'next_cu_empty',
    ),
    scoreQaAxis(
      'question_binds_cu',
      binds ? 'PASS' : genericAfterNext || stakeWeavedOffCu(upgraded) ? 'PARTIAL' : 'FAIL',
      `kind=${upgraded.kind} tracks=${questionTracksCuPriority(upgraded)} weaveOff=${stakeWeavedOffCu(upgraded)}`,
      binds
        ? null
        : genericAfterNext
          ? 'generic_ask_after_specific_cu'
          : stakeWeavedOffCu(upgraded)
            ? 'stake_weave_off_cu'
            : 'question_off_cu_priority',
    ),
    scoreQaAxis(
      'not_generic_after_specific',
      genericAfterNext ? 'PARTIAL' : isGenericAsk(upgraded) ? 'FAIL' : 'PASS',
      genericAfterNext ? 'generic ask after next-unknown CU' : `kind=${upgraded.kind}`,
      genericAfterNext ? 'generic_ask_after_specific_cu' : null,
    ),
    scoreQaAxis(
      'negative_question_realigns',
      downBinds ? 'PASS' : 'FAIL',
      `down kind=${downgraded.kind}`,
      downBinds ? null : 'generic_after_downgrade',
    ),
  ];

  return {
    id,
    unnamed: id.startsWith('nameless_'),
    kind: t0.kind,
    dceTwoTwo: t0.kind === 'paid_conversion',
    hops: `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
    paymentOnlyOffS3: paidOnly.stageId !== 'S3' && paidOnly.stageId !== 'S4',
    leftoverPositive: fourDown.leftoverPositive,
    paidPromoted,
    t0: { cu: t0.criticalUnknown, kind: t0.kind, question: t0.question },
    promotion: {
      cuMoved,
      priorityMoved,
      nextUnknownCu: nextCu,
      cu: upgraded.criticalUnknown,
      priority: upgraded.validationPriority,
      kind: upgraded.kind,
      question: upgraded.question,
      binds,
      genericAfterNext,
    },
    downgrade: {
      kind: downgraded.kind,
      question: downgraded.question,
      binds: downBinds,
      leftoverPositive: fourDown.leftoverPositive,
      declined: downOk,
    },
    axes,
    failures: [...new Set(failures)],
  };
}

describe('S.I. Question Alignment Batch — measure only', () => {
  it('does not rewrite analyzer, presenter, ask kind, or persist SoT', () => {
    expect(ANALYZER_SRC).toMatch(/function applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(ANALYZER_SRC).toMatch(/function isRepeatDirectDenial/);
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(ANALYZER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
    expect(PRESENTER_SRC).not.toMatch(/from ['"].*decide-next-question-from-review['"]/);
  });

  it('records whether the spoken question binds the next unresolved CU', () => {
    const caseIds: CaseId[] = [
      ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
      ...(Object.keys(NAMELESS) as Array<keyof typeof NAMELESS>),
    ];
    const rows = caseIds.map((id) => scoreCase(id));
    const axisIds: QaAxisId[] = [
      'cu_resolved',
      'next_cu_specific',
      'question_binds_cu',
      'not_generic_after_specific',
      'negative_question_realigns',
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
          fixBatch2Sha: FIX_SHA,
          scenarioCount: rows.length,
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
    expect(rows.filter((row) => row.dceTwoTwo)).toHaveLength(5);
    expect(rows.every((row) => row.axes.length === 5)).toBe(true);
    expect(rows.filter((row) => row.dceTwoTwo).every((row) => row.paymentOnlyOffS3)).toBe(true);
    expect(rows.every((row) => row.leftoverPositive === false)).toBe(true);
    expect(rows.every((row) => row.downgrade.declined)).toBe(true);
  });
});
