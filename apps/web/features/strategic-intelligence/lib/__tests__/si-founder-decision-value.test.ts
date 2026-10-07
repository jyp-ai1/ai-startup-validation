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
  declined,
  founderVisible,
  inducesOppositeDecision,
  leaksInternalIds,
  readAsFounder,
  rollup,
  rose,
  scoreActionability,
  scoreDecisionValue,
  scoreJudgmentClarity,
  scoreRiskClarity,
  scoreValidationClarity,
  type DecisionAxisId,
  type DecisionScenario,
  type DecisionSnap,
} from './score-si-founder-decision-value';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-decision-value.json',
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

/** Representative unnamed from the prior holdout — no new brand names. */
const UNNAMED = {
  unnamed_salon_noshow: {
    documentText: `미용실 예약은 no-show가 15%에 달합니다.
기존 대안은 문자 리마인더입니다.
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

type DecisionId = keyof typeof SI_CALIBRATION_CASES | keyof typeof UNNAMED;

const AXIS_IDS: DecisionAxisId[] = [
  'judgment_clarity',
  'risk_clarity',
  'validation_clarity',
  'actionability',
];

function caseInput(id: DecisionId): { title?: string; documentText: string } {
  if (id in UNNAMED) {
    return { title: undefined, documentText: UNNAMED[id as keyof typeof UNNAMED].documentText };
  }
  const fixture = getSiCalibrationCase(id as keyof typeof SI_CALIBRATION_CASES);
  return { title: fixture.title, documentText: fixture.documentText };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): DecisionSnap {
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

function runTurns(title: string | undefined, documentText: string, answers: string[]) {
  const turns: DecisionSnap[] = [];
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

function last(turns: DecisionSnap[]): DecisionSnap {
  return turns[turns.length - 1]!;
}

function clinicStake(id: DecisionId, cu: string) {
  if (id === 'clinicflow') return { noun: 'no-show', from: '22%', to: '12%', worse: '24%' };
  if (id === 'fitbridge') return { noun: '반품률', from: '38%', to: '29%', worse: '41%' };
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '15%', to: '7%', worse: '19%' };
  if (/반품/.test(cu)) return { noun: '반품률', from: '9%', to: '4%', worse: '14%' };
  if (/부하/.test(cu)) return { noun: '부하', from: '28%', to: '12%', worse: '33%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function dceStakeOpenCu(cu: string): boolean {
  return /(no-show|노쇼|반품|누락|불일치|미스매치|이탈|부하|지불만|전후)/.test(cu);
}

function playbook(id: DecisionId, kind: string, cu: string) {
  const stake = clinicStake(id, cu);
  if (kind === 'repeat_loop') {
    return {
      upgrade: pickSiIntegrationAnswer('repeat_loop', 'validated'),
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
    };
  }
  if (kind === 'payer_split') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_split', 'validated'),
      negative: '결제자 3명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
    };
  }
  if (kind === 'payer_job') {
    return {
      upgrade: pickSiIntegrationAnswer('payer_job', 'validated'),
      negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    };
  }
  if (kind === 'segment_proof') {
    return {
      upgrade: pickSiIntegrationAnswer('segment_proof', 'validated'),
      negative: '지목한 고객은 쓰지 않았고 아무도 지불하지 않았다.',
    };
  }
  if (dceStakeOpenCu(cu)) {
    return {
      upgrade: `결제 후보 2명이 월 구독을 결제했고 ${stake.noun}가 ${stake.from}에서 ${stake.to}로 줄었다.`,
      negative: `유료 2곳이 해지했고 ${stake.noun}가 ${stake.to}에서 ${stake.worse}로 늘었다.`,
    };
  }
  return {
    upgrade: pickSiIntegrationAnswer('paid_conversion', 'validated'),
    negative: '유료 2곳이 해지했고 아무도 결제하지 않았다.',
  };
}

function scoreScenario(scenario: DecisionScenario, snap: DecisionSnap, previous?: DecisionSnap) {
  const read = readAsFounder(snap);
  const opposite = inducesOppositeDecision(scenario, snap, previous);
  const leak = leaksInternalIds(founderVisible(snap));
  const axes = {
    judgment_clarity: opposite ? 'FAIL' : scoreJudgmentClarity(scenario, snap, read, previous),
    risk_clarity: scoreRiskClarity(snap, read),
    validation_clarity: scoreValidationClarity(snap, read),
    actionability: scoreActionability(scenario, snap, read),
  } as const;
  return {
    scenario,
    stageId: snap.stageId,
    verdictId: snap.verdictId,
    verdictLabel: snap.verdictLabel,
    initialJudgment: snap.judgment,
    founderUnderstoodJudgment: read.understoodJudgment,
    why: snap.whyPossible,
    founderUnderstoodWhy: read.understoodWhy,
    criticalUnknown: snap.criticalUnknown,
    founderPointedUnknown: read.understoodUnknown,
    decisionChangingEvidence: snap.decisionChangingEvidence,
    founderUnderstoodDce: read.understoodDce,
    nextAction: read.chosenNextAction,
    reJudgment: snap.judgment,
    founderVisible: [
      'S.I. 사업성 판단',
      `${SI_STAGE_LABELS[snap.stageId as keyof typeof SI_STAGE_LABELS]} · 점수 없음`,
      founderVisible(snap),
    ].join('\n'),
    opposite,
    leak,
    axes,
    founderDecisionValue: scoreDecisionValue(Object.values(axes)),
  };
}

export function decisionCaseIds(): DecisionId[] {
  return [
    ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
    ...(Object.keys(UNNAMED) as Array<keyof typeof UNNAMED>),
  ];
}

export function scoreCase(id: DecisionId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(id, t0.kind, t0.criticalUnknown);
  const go = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const stop = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));

  const hold = scoreScenario('HOLD', t0);
  const goScored = scoreScenario('GO', go, t0);
  const stopScored = scoreScenario('STOP', stop, go);

  const axisRollup = Object.fromEntries(
    AXIS_IDS.map((axis) => [
      axis,
      rollup([hold.axes[axis], goScored.axes[axis], stopScored.axes[axis]]),
    ]),
  ) as Record<DecisionAxisId, ReturnType<typeof rollup>>;

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    kind: t0.kind,
    hops: {
      hold: t0.stageId,
      go: `${t0.stageId}→${go.stageId}`,
      stop: `${go.stageId}→${stop.stageId}`,
      rose: rose(
        { ...t0, evidenceClass: t0.evidenceClass },
        { ...go, evidenceClass: go.evidenceClass },
      ),
      declined: declined(
        { ...go, evidenceClass: go.evidenceClass },
        { ...stop, evidenceClass: stop.evidenceClass },
      ),
    },
    scenarios: { HOLD: hold, GO: goScored, STOP: stopScored },
    axes: axisRollup,
    founderDecisionValue: rollup([
      hold.founderDecisionValue,
      goScored.founderDecisionValue,
      stopScored.founderDecisionValue,
    ]),
    opposite: hold.opposite || goScored.opposite || stopScored.opposite,
    leak: hold.leak || goScored.leak || stopScored.leak,
  };
}

describe('S.I. Founder Decision Value Gate', () => {
  it('does not rewrite analyzer, classifier, presenter, ask, persist SoT, or brand-branch', () => {
    expect(ENGINE_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ENGINE_SRC).toMatch(/function decideStage/);
    expect(ENGINE_SRC).toMatch(/function decideVerdict/);
    expect(ENGINE_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(ENGINE_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    const engineDiff = execSync(
      `git diff ${PRODUCTION_SHA} -- ${ENGINE_FILES.map((file) => `apps/web/features/strategic-intelligence/lib/${file}`).join(' ')}`,
      { cwd: resolve(process.cwd(), '../..'), encoding: 'utf8' },
    );
    expect(engineDiff).toBe('');
  });

  it('records Founder decision value on calibration plus representative unnamed', () => {
    const rows = decisionCaseIds().map((id) => scoreCase(id));
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
    const decisionValue = rollup(rows.map((row) => row.founderDecisionValue));

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          productionUnchanged: true,
          measureOnly: true,
          priorGate: 'Founder Strategy Validation PASS CLOSED',
          scenarioCount: rows.length,
          calibration: rows.filter((row) => !row.unnamed).length,
          unnamed: rows.filter((row) => row.unnamed).length,
          taxonomy,
          axisCounts,
          founderDecisionValue: decisionValue,
          regression: {
            oppositeDecision: rows.filter((row) => row.opposite).length,
            visibleLeak: rows.filter((row) => row.leak).length,
            rose: rows.filter((row) => row.hops.rose).length,
            declined: rows.filter((row) => row.hops.declined).length,
          },
          rows: rows.map((row) => ({
            id: row.id,
            unnamed: row.unnamed,
            kind: row.kind,
            hops: row.hops,
            axes: row.axes,
            founderDecisionValue: row.founderDecisionValue,
            opposite: row.opposite,
            leak: row.leak,
            scenarios: row.scenarios,
          })),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(8);
    expect(rows.filter((row) => row.unnamed)).toHaveLength(3);
    expect(rows.filter((row) => !row.unnamed)).toHaveLength(5);
    expect(rows.every((row) => row.leak === false)).toBe(true);
    expect(rows.every((row) => row.opposite === false)).toBe(true);
    expect(rows.filter((row) => row.hops.rose).length).toBeGreaterThan(0);
    expect(rows.filter((row) => row.hops.declined).length).toBeGreaterThan(0);
    expect(axisCounts.judgment_clarity.FAIL).toBe(0);
    expect(axisCounts.risk_clarity.FAIL).toBe(0);
    expect(axisCounts.validation_clarity.FAIL).toBe(0);
    expect(axisCounts.actionability.FAIL).toBe(0);
  });
});
