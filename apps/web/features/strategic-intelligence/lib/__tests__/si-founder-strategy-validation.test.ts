import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { SI_STAGE_LABELS, SI_VERDICT_LABELS } from '@repo/types/domain/strategic-intelligence';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  classifyFounderEvidenceClass,
  founderVisible,
  leaksInternalIds,
  rollup,
  scoreConflictAxis,
  scoreCoreLoop,
  scoreCuAxis,
  scoreCuSurface,
  scoreDceSurface,
  scoreExecutiveJudgment,
  scoreFounderOutcomeSurface,
  scoreNegativeAxis,
  scorePartial,
  scorePositive,
  scoreQuestionAxis,
  scoreWhy,
  type StrategyAxisId,
  type StrategySnap,
} from './score-si-founder-strategy-validation';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-strategy-validation.json',
);
const LIB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION_SHA = '1690cbf';

const ENGINE_FILES = [
  'analyze-strategic-intelligence.ts',
  'present-si-ai-pm-question.ts',
  'decide-si-validation-ask.ts',
  'classify-founder-evidence.ts',
  'update-strategic-intelligence.ts',
] as const;

const ENGINE_SRC = ENGINE_FILES.map((file) =>
  readFileSync(resolve(LIB_DIR, file), 'utf8'),
).join('\n');

const UNNAMED = {
  unnamed_salon_noshow: {
    documentText: `미용실 예약은 no-show가 15%에 달합니다.
기존 대안은 문자 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_photo_mismatch: {
    documentText: `상품 촬영 검수는 미스매치가 17%에 달합니다.
기존 대안은 수동 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_queue_load: {
    documentText: `외래 접수 창구는 피크 시 대기 부하가 28%에서 멈추지 않습니다.
기존 대안은 번호표 키오스크입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_claim_gap: {
    documentText: `보험 청구 마감은 서류 불일치가 11%입니다.
기존 대안은 스프레드시트 점검입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_handoff_nometric: {
    documentText: `병동 교대는 인수인계를 수기로 남겨 반복 확인이 어렵습니다.
기존 대안은 범용 메신저입니다.
아직 출시되지 않았고 매출은 없습니다.`,
  },
  unnamed_care_job: {
    documentText: `재가 돌봄은 가족이 쓰지만 이용료는 센터장이 낼 것으로 봅니다.
사용자는 가족이고, 실제 비용을 내는 구매자는 센터장이 될 것으로 봅니다.
아직 출시되지 않았고 매출은 없습니다.
센터장이 이용료를 낼 의향인지도 확인되지 않았습니다.
기존 대안은 전화 일정 조율입니다.`,
  },
} as const;

type StrategyId = keyof typeof SI_CALIBRATION_CASES | keyof typeof UNNAMED;

const AXIS_IDS: StrategyAxisId[] = [
  'core_loop',
  'positive',
  'partial',
  'negative',
  'conflict',
  'cu',
  'question',
  'founder_outcome',
];

const INTENT_ANSWERS = [
  '그렇다',
  '할 예정이다',
  '계획이다',
  '유료로 전환할 계획이다',
] as const;

function caseInput(id: StrategyId): { title?: string; documentText: string } {
  if (id in UNNAMED) {
    return { title: undefined, documentText: UNNAMED[id as keyof typeof UNNAMED].documentText };
  }
  const fixture = getSiCalibrationCase(id as keyof typeof SI_CALIBRATION_CASES);
  return { title: fixture.title, documentText: fixture.documentText };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): StrategySnap {
  const j = view.current.judgment;
  return {
    verdictId: j.verdictId,
    verdictLabel: SI_VERDICT_LABELS[j.verdictId],
    stageId: j.stageId,
    judgment: j.judgment,
    whyPossible: j.whyPossible,
    whyFail: j.whyFail,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    question: view.current.question.questionText,
    whyAsking: view.current.question.whyAsking,
    kind: view.current.question.kind,
    evidenceClass: view.current.update?.addedEvidence[0]?.evidenceClass ?? null,
    evidenceClasses: j.evidenceMap.map((item) => item.evidenceClass),
    risks: j.risks,
    strengths: j.strengths,
  };
}

function founderSurface(current: StrategySnap, stageLabel: string): string {
  return [
    'S.I. 사업성 판단',
    `${stageLabel} · 점수 없음`,
    `현재 판단: ${current.verdictLabel}`,
    current.judgment,
    current.whyPossible,
    current.whyFail,
    current.evidenceClasses.join(' / '),
    ...current.strengths,
    ...current.risks,
    current.criticalUnknown,
    current.decisionChangingEvidence,
    current.validationPriority,
    'AI PM · S.I.가 지정한 검증',
    current.question,
    current.whyAsking,
  ].join('\n');
}

function runTurns(title: string | undefined, documentText: string, answers: string[]) {
  const turns: StrategySnap[] = [];
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
  return { turns, document };
}

function last(turns: StrategySnap[]): StrategySnap {
  return turns[turns.length - 1]!;
}

function stakeFromUnknown(cu: string) {
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '15%', to: '7%', worse: '19%' };
  if (/반품/.test(cu)) return { noun: '반품률', from: '9%', to: '4%', worse: '14%' };
  if (/누락/.test(cu)) return { noun: '누락', from: '31%', to: '14%', worse: '36%' };
  if (/부하/.test(cu)) return { noun: '부하', from: '28%', to: '12%', worse: '33%' };
  if (/이탈/.test(cu)) return { noun: '이탈', from: '47%', to: '21%', worse: '51%' };
  if (/불일치/.test(cu)) return { noun: '불일치', from: '11%', to: '4%', worse: '16%' };
  if (/미스매치/.test(cu)) return { noun: '미스매치', from: '17%', to: '8%', worse: '22%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function clinicStake(id: StrategyId, cu: string) {
  if (id === 'clinicflow') return { noun: 'no-show', from: '22%', to: '12%', worse: '24%' };
  if (id === 'fitbridge') return { noun: '반품률', from: '38%', to: '29%', worse: '41%' };
  return stakeFromUnknown(cu);
}

function dceStakeOpenCu(cu: string): boolean {
  return /(no-show|노쇼|반품|누락|불일치|미스매치|이탈|부하|지불만|전후)/.test(cu);
}

function playbook(id: StrategyId, kind: string, cu: string) {
  const stake = clinicStake(id, cu);
  if (kind === 'repeat_loop') {
    return {
      upgrade: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      directConflict: '실제 재판매는 발생하지 않았다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      dceTwoTwo: false,
    };
  }
  if (kind === 'segment_proof') {
    return {
      upgrade: pickSiIntegrationAnswer('segment_proof', 'validated'),
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: '지목한 고객은 쓰지 않았고 아무도 지불하지 않았다.',
      directConflict: '실제로 결제한 고객은 없었다.',
      dceTwoTwo: false,
    };
  }
  if (dceStakeOpenCu(cu)) {
    return {
      upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
      paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
      negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
      directConflict: '실제로 결제한 고객은 없었다.',
      dceTwoTwo: true,
    };
  }
  return {
    upgrade: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    paymentOnly: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    negative: '유료 2곳이 해지했고 아무도 결제하지 않았다.',
    directConflict: '실제로 결제한 고객은 없었다.',
    dceTwoTwo: false,
  };
}

function scenarioRecord(
  name: 'A' | 'B' | 'C',
  t0: StrategySnap,
  after: StrategySnap,
  answer: string,
  evidenceBefore: string[],
  evidenceAfter: string[],
) {
  return {
    name,
    initialJudgment: t0.judgment,
    initialCu: t0.criticalUnknown,
    initialDce: t0.decisionChangingEvidence,
    aiPmQuestion: t0.question,
    founderAnswer: answer,
    evidenceBefore,
    evidenceAfter,
    reJudgment: after.judgment,
    cuBefore: t0.criticalUnknown,
    cuAfter: after.criticalUnknown,
    priorityBefore: t0.validationPriority,
    priorityAfter: after.validationPriority,
    founderVisible: founderSurface(after, SI_STAGE_LABELS[after.stageId as keyof typeof SI_STAGE_LABELS]),
  };
}

export function strategyCaseIds(): StrategyId[] {
  return [
    ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
    ...(Object.keys(UNNAMED) as Array<keyof typeof UNNAMED>),
  ];
}

export function scoreCase(id: StrategyId) {
  const input = caseInput(id);
  const t0Run = runTurns(input.title, input.documentText, []);
  const t0 = t0Run.turns[0]!;
  const book = playbook(id, t0.kind, t0.criticalUnknown);

  const paidRun = runTurns(input.title, input.documentText, [book.paymentOnly]);
  const paidOnly = last(paidRun.turns);
  const upgradeRun = runTurns(input.title, input.documentText, [book.upgrade]);
  const upgraded = last(upgradeRun.turns);
  const downRun = runTurns(input.title, input.documentText, [book.upgrade, book.negative]);
  const downgraded = last(downRun.turns);
  const conflictRun = runTurns(input.title, input.documentText, [book.upgrade, book.directConflict]);
  const conflicted = last(conflictRun.turns);

  const intentClass = classifyFounderEvidenceClass(pickSiIntegrationAnswer('paid_conversion', 'intent'));
  const planClass = classifyFounderEvidenceClass('할 예정이다');
  const yesClass = classifyFounderEvidenceClass('그렇다');

  const t0Evidence = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: input.documentText,
  }).current.judgment.evidenceMap.map((item) => `${item.evidenceClass}:${item.text}`);
  const upgradedEvidence = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: upgradeRun.document,
  }).current.judgment.evidenceMap.map((item) => `${item.evidenceClass}:${item.text}`);
  const paidEvidence = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: paidRun.document,
  }).current.judgment.evidenceMap.map((item) => `${item.evidenceClass}:${item.text}`);
  const downEvidence = resolveSiJourneyIntegration({
    title: input.title,
    businessDocument: downRun.document,
  }).current.judgment.evidenceMap.map((item) => `${item.evidenceClass}:${item.text}`);

  const surfaces = {
    executiveJudgment: scoreExecutiveJudgment(t0),
    why: scoreWhy(t0),
    criticalUnknown: scoreCuSurface(t0),
    decisionChangingEvidence: scoreDceSurface(t0),
    validationQuestion: scoreQuestionAxis(t0, upgraded),
    reJudgment: scoreCoreLoop(t0, upgraded, upgraded.evidenceClass),
  };

  const axes = {
    core_loop: scoreCoreLoop(t0, upgraded, upgraded.evidenceClass),
    positive: scorePositive(t0, upgraded),
    partial: scorePartial(t0, paidOnly, intentClass, planClass, yesClass, book.dceTwoTwo),
    negative: scoreNegativeAxis(upgraded, downgraded),
    conflict: scoreConflictAxis(upgraded, conflicted),
    cu: scoreCuAxis(t0, upgraded),
    question: scoreQuestionAxis(t0, upgraded),
    founder_outcome: scoreFounderOutcomeSurface([t0, upgraded, paidOnly, downgraded, conflicted]),
  };

  const visibleLeak =
    leaksInternalIds(founderVisible(t0)) ||
    leaksInternalIds(founderVisible(upgraded)) ||
    leaksInternalIds(founderVisible(downgraded));

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    kind: t0.kind,
    dceTwoTwo: book.dceTwoTwo,
    hops: {
      t0: t0.stageId,
      upgrade: `${t0.stageId}→${upgraded.stageId}`,
      partial: `${t0.stageId}→${paidOnly.stageId}`,
      down: `${upgraded.stageId}→${downgraded.stageId}`,
      conflict: `${upgraded.stageId}→${conflicted.stageId}`,
    },
    surfaces,
    axes,
    rollup: rollup(Object.values(axes)),
    visibleLeak,
    answerNotValidation: {
      intentClass,
      planClass,
      yesClass,
      allNotValidated: [intentClass, planClass, yesClass].every((value) => value !== 'VALIDATED'),
    },
    paymentOnly: {
      stageId: paidOnly.stageId,
      verdictId: paidOnly.verdictId,
      offS3: paidOnly.stageId !== 'S3' && paidOnly.stageId !== 'S4',
    },
    scenarios: {
      A: scenarioRecord('A', t0, upgraded, book.upgrade, t0Evidence, upgradedEvidence),
      B: scenarioRecord('B', t0, paidOnly, book.paymentOnly, t0Evidence, paidEvidence),
      C: scenarioRecord('C', upgraded, downgraded, book.negative, upgradedEvidence, downEvidence),
    },
    conflictClass: conflicted.evidenceClass,
    leftoverPositive: /가능성이 높음/.test(downgraded.judgment) &&
      (downgraded.verdictId === 'judgment_deferred' || downgraded.verdictId === 'insufficient_basis'),
  };
}

describe('S.I. Founder Strategy Validation Gate', () => {
  it('does not rewrite analyzer, classifier, presenter, ask, persist SoT, or brand-branch', () => {
    expect(ENGINE_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ENGINE_SRC).toMatch(/function decideStage/);
    expect(ENGINE_SRC).toMatch(/function decideVerdict/);
    expect(ENGINE_SRC).toMatch(/function hasLiveValidated/);
    expect(ENGINE_SRC).toMatch(/function applySignalRetractions/);
    expect(ENGINE_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(ENGINE_SRC).toMatch(/function detectSiValidationKind/);
    expect(ENGINE_SRC).toMatch(/function classifyFounderEvidenceClass/);
    expect(ENGINE_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    const engineDiff = execSync(
      `git diff ${PRODUCTION_SHA} -- ${ENGINE_FILES.map((file) => `apps/web/features/strategic-intelligence/lib/${file}`).join(' ')}`,
      { cwd: resolve(process.cwd(), '../..'), encoding: 'utf8' },
    );
    expect(engineDiff).toBe('');
  });

  it('does not treat intent, plan, or yes as VALIDATED', () => {
    for (const answer of INTENT_ANSWERS) {
      expect(classifyFounderEvidenceClass(answer)).not.toBe('VALIDATED');
    }
    expect(classifyFounderEvidenceClass(pickSiIntegrationAnswer('paid_conversion', 'intent'))).not.toBe(
      'VALIDATED',
    );
  });

  it('records the founder-visible loop on calibration plus fresh unnamed holdout', () => {
    const rows = strategyCaseIds().map((id) => scoreCase(id));
    const taxonomy = Object.fromEntries(
      AXIS_IDS.map((id) => [id, rollup(rows.map((row) => row.axes[id]))]),
    );
    const axisCounts = Object.fromEntries(
      AXIS_IDS.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.axes[id] === 'PASS').length,
          PARTIAL: rows.filter((row) => row.axes[id] === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.axes[id] === 'FAIL').length,
        },
      ]),
    );
    const surfaceCounts = Object.fromEntries(
      (['executiveJudgment', 'why', 'criticalUnknown', 'decisionChangingEvidence', 'validationQuestion', 'reJudgment'] as const).map(
        (id) => [
          id,
          {
            PASS: rows.filter((row) => row.surfaces[id] === 'PASS').length,
            PARTIAL: rows.filter((row) => row.surfaces[id] === 'PARTIAL').length,
            FAIL: rows.filter((row) => row.surfaces[id] === 'FAIL').length,
          },
        ],
      ),
    );

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          productionUnchanged: true,
          measureOnly: true,
          scenarioCount: rows.length,
          calibration: rows.filter((row) => !row.unnamed).length,
          unnamed: rows.filter((row) => row.unnamed).length,
          taxonomy,
          axisCounts,
          surfaceCounts,
          regression: {
            paymentOnlyOffS3: rows.filter((row) => row.dceTwoTwo).every((row) => row.paymentOnly.offS3),
            leftoverPositive: rows.filter((row) => row.leftoverPositive).length,
            visibleLeak: rows.filter((row) => row.visibleLeak).length,
            answerNotValidation: rows.every((row) => row.answerNotValidation.allNotValidated),
          },
          rows: rows.map((row) => ({
            id: row.id,
            unnamed: row.unnamed,
            kind: row.kind,
            hops: row.hops,
            surfaces: row.surfaces,
            axes: row.axes,
            rollup: row.rollup,
            paymentOnly: row.paymentOnly,
            conflictClass: row.conflictClass,
            leftoverPositive: row.leftoverPositive,
            answerNotValidation: row.answerNotValidation,
            scenarios: row.scenarios,
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
    expect(rows.every((row) => row.answerNotValidation.allNotValidated)).toBe(true);
    expect(rows.every((row) => row.visibleLeak === false)).toBe(true);
    expect(rows.filter((row) => row.dceTwoTwo).every((row) => row.paymentOnly.offS3)).toBe(true);
    expect(rows.every((row) => row.leftoverPositive === false)).toBe(true);
    expect(axisCounts.core_loop.FAIL).toBe(0);
    expect(axisCounts.partial.FAIL).toBe(0);
    expect(surfaceCounts.executiveJudgment.FAIL).toBe(0);
    expect(surfaceCounts.criticalUnknown.FAIL).toBe(0);
    expect(surfaceCounts.decisionChangingEvidence.FAIL).toBe(0);
    expect(surfaceCounts.reJudgment.FAIL).toBe(0);
  });
});
