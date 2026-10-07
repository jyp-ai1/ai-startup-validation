import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase, SI_CALIBRATION_CASES } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { presentSiFounderHeadline, presentSiFounderJudgment } from '../present-si-founder-judgment';
import {
  presentedHeadline,
  rollup,
  scoreActionability,
  scoreCuHeadline,
  scoreDirectConflict,
  scoreHeadlineStage,
  scorePartialEvidence,
  scorePositivePromotion,
  scoreS4ToS3,
  type PresentationAxisId,
  type PresentationSnap,
} from './score-si-founder-decision-presentation';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-founder-decision-presentation.json',
);
const LIB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION_SHA = '1690cbf';

const ANALYZER = 'analyze-strategic-intelligence.ts';
const PRESENTER = 'present-si-founder-judgment.ts';
const ASK = 'decide-si-validation-ask.ts';
const CLASSIFIER = 'classify-founder-evidence.ts';
const QUESTION = 'present-si-ai-pm-question.ts';
const UPDATE = 'update-strategic-intelligence.ts';

const ENGINE_SRC = [ANALYZER, ASK, CLASSIFIER, QUESTION, UPDATE]
  .map((file) => readFileSync(resolve(LIB_DIR, file), 'utf8'))
  .join('\n');
const PRESENTER_SRC = readFileSync(resolve(LIB_DIR, PRESENTER), 'utf8');
const SURFACE_SRC = readFileSync(
  resolve(LIB_DIR, '../components/si-review-surface.tsx'),
  'utf8',
);

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

type CaseId = keyof typeof SI_CALIBRATION_CASES | keyof typeof UNNAMED;

const AXIS_IDS: PresentationAxisId[] = [
  'positive_promotion',
  'partial_evidence',
  'direct_conflict',
  's4_to_s3',
  'headline_stage',
  'cu_headline',
  'actionability',
];

function caseInput(id: CaseId): { title?: string; documentText: string } {
  if (id in UNNAMED) {
    return { title: undefined, documentText: UNNAMED[id as keyof typeof UNNAMED].documentText };
  }
  const fixture = getSiCalibrationCase(id as keyof typeof SI_CALIBRATION_CASES);
  return { title: fixture.title, documentText: fixture.documentText };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): PresentationSnap {
  const j = view.current.judgment;
  return {
    verdictId: j.verdictId,
    stageId: j.stageId,
    judgment: j.judgment,
    criticalUnknown: j.criticalUnknown,
    decisionChangingEvidence: j.decisionChangingEvidence,
    validationPriority: j.validationPriority,
    question: view.current.question.questionText,
    whyAsking: view.current.question.whyAsking,
    kind: view.current.question.kind,
    evidenceClass: view.current.update?.addedEvidence[0]?.evidenceClass ?? null,
    evidenceClasses: j.evidenceMap.map((item) => item.evidenceClass),
  };
}

function runTurns(title: string | undefined, documentText: string, answers: string[]) {
  const turns: PresentationSnap[] = [];
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

function last(turns: PresentationSnap[]): PresentationSnap {
  return turns[turns.length - 1]!;
}

function clinicStake(id: CaseId, cu: string) {
  if (id === 'clinicflow') return { noun: 'no-show', from: '22%', to: '12%', worse: '24%' };
  if (id === 'fitbridge') return { noun: '반품률', from: '38%', to: '29%', worse: '41%' };
  if (/no-show|노쇼/i.test(cu)) return { noun: 'no-show', from: '15%', to: '7%', worse: '19%' };
  return { noun: '이탈', from: '25%', to: '12%', worse: '30%' };
}

function dceStakeOpenCu(cu: string): boolean {
  return /(no-show|노쇼|반품|누락|불일치|미스매치|이탈|부하|지불만|전후)/.test(cu);
}

function playbook(id: CaseId, kind: string, cu: string) {
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

export function presentationCaseIds(): CaseId[] {
  return [
    ...(Object.keys(SI_CALIBRATION_CASES) as Array<keyof typeof SI_CALIBRATION_CASES>),
    ...(Object.keys(UNNAMED) as Array<keyof typeof UNNAMED>),
  ];
}

export function scoreCase(id: CaseId) {
  const input = caseInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const book = playbook(id, t0.kind, t0.criticalUnknown);
  const paidOnly = last(runTurns(input.title, input.documentText, [book.paymentOnly]));
  const upgraded = last(runTurns(input.title, input.documentText, [book.upgrade]));
  const downgraded = last(runTurns(input.title, input.documentText, [book.upgrade, book.negative]));
  const conflicted = last(runTurns(input.title, input.documentText, [book.upgrade, book.directConflict]));

  const axes = {
    positive_promotion: scorePositivePromotion(t0, upgraded),
    partial_evidence: scorePartialEvidence(t0, paidOnly, book.dceTwoTwo),
    direct_conflict: scoreDirectConflict(upgraded, conflicted),
    s4_to_s3: scoreS4ToS3(upgraded, downgraded),
    headline_stage: scoreHeadlineStage([t0, paidOnly, upgraded, downgraded, conflicted]),
    cu_headline: scoreCuHeadline([t0, paidOnly, upgraded, downgraded, conflicted]),
    actionability: rollup([
      scoreActionability(t0),
      scoreActionability(upgraded),
      scoreActionability(downgraded),
    ]),
  };

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    kind: t0.kind,
    dceTwoTwo: book.dceTwoTwo,
    hops: {
      hold: t0.stageId,
      go: `${t0.stageId}→${upgraded.stageId}`,
      stop: `${upgraded.stageId}→${downgraded.stageId}`,
      conflict: `${upgraded.stageId}→${conflicted.stageId}`,
    },
    headlines: {
      hold: presentedHeadline(t0),
      go: presentedHeadline(upgraded),
      stop: presentedHeadline(downgraded),
      conflict: presentedHeadline(conflicted),
      partial: presentedHeadline(paidOnly),
    },
    internal: {
      goVerdict: upgraded.verdictId,
      stopVerdict: downgraded.verdictId,
      stopClass: downgraded.evidenceClass,
      stopCu: downgraded.criticalUnknown,
      conflictClass: conflicted.evidenceClass,
    },
    axes,
    rollup: rollup(Object.values(axes)),
  };
}

describe('S.I. Founder Decision Presentation Gate', () => {
  it('keeps analyzer, classifier, ask, question, and persist SoT unchanged', () => {
    const engineDiff = execSync(
      `git diff ${PRODUCTION_SHA} -- ${[ANALYZER, ASK, CLASSIFIER, QUESTION, UPDATE]
        .map((file) => `apps/web/features/strategic-intelligence/lib/${file}`)
        .join(' ')}`,
      { cwd: resolve(process.cwd(), '../..'), encoding: 'utf8' },
    );
    expect(engineDiff).toBe('');
    expect(ENGINE_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(PRESENTER_SRC).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
    expect(PRESENTER_SRC).not.toMatch(/function decideStage|function decideVerdict|function pickCriticalUnknown/);
    expect(SURFACE_SRC).toMatch(/presentSiFounderJudgment/);
  });

  it('reconciles S3 viable away from the S4 headline without treating repeat-zero as CONFLICT', () => {
    const s3 = presentSiFounderHeadline({ stageId: 'S3', verdictId: 'viable' });
    const s4 = presentSiFounderHeadline({ stageId: 'S4', verdictId: 'viable' });
    const deferred = presentSiFounderHeadline({ stageId: 'S1', verdictId: 'judgment_deferred' });
    expect(s3).not.toBe(s4);
    expect(s3).not.toMatch(/가능성이 높음/);
    expect(s4).toMatch(/가능성이 높음/);
    expect(deferred).toMatch(/보류/);
    const presented = presentSiFounderJudgment({
      version: 1,
      verdictId: 'viable',
      stageId: 'S3',
      judgment: '현재 판단: 사업화 가능성이 높음. 핵심 리스크: 재판매가 반복되는가.',
      whyPossible: '매출이 있다.',
      whyFail: '재판매가 없다.',
      evidenceMap: [],
      strengths: [],
      risks: [],
      axes: [],
      criticalUnknown: '재판매가 반복되는가.',
      decisionChangingEvidence: '재판매 데이터. 있으면 올리고 없으면 내린다.',
      validationPriority: '재판매를 확인한다.',
      source: 'si-v1',
    });
    expect(presented.headline).toBe(s3);
    expect(presented.prose).toMatch(/^현재 판단: 출시·초기 매출은 있으나 반복 검증은 아직이다/);
    expect(presented.prose).not.toMatch(/현재 판단: 사업화 가능성이 높음/);
  });

  it('records presentation consistency on calibration plus representative unnamed', () => {
    const rows = presentationCaseIds().map((id) => scoreCase(id));
    const taxonomy = Object.fromEntries(
      AXIS_IDS.map((id) => [
        id,
        rollup(rows.map((row) => row.axes[id]).filter((score) => score !== 'N/A')),
      ]),
    );
    const axisCounts = Object.fromEntries(
      AXIS_IDS.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.axes[id] === 'PASS').length,
          PARTIAL: rows.filter((row) => row.axes[id] === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.axes[id] === 'FAIL').length,
          'N/A': rows.filter((row) => row.axes[id] === 'N/A').length,
        },
      ]),
    );

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          productionUnchanged: true,
          presenterOnly: true,
          scenarioCount: rows.length,
          calibration: rows.filter((row) => !row.unnamed).length,
          unnamed: rows.filter((row) => row.unnamed).length,
          taxonomy,
          axisCounts,
          rows: rows.map((row) => ({
            id: row.id,
            unnamed: row.unnamed,
            kind: row.kind,
            hops: row.hops,
            headlines: row.headlines,
            internal: row.internal,
            axes: row.axes,
            rollup: row.rollup,
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
    expect(axisCounts.positive_promotion.FAIL).toBe(0);
    expect(axisCounts.partial_evidence.FAIL).toBe(0);
    expect(axisCounts.direct_conflict.FAIL).toBe(0);
    expect(axisCounts.s4_to_s3.FAIL).toBe(0);
    expect(axisCounts.headline_stage.FAIL).toBe(0);
    expect(axisCounts.cu_headline.FAIL).toBe(0);
    expect(axisCounts.actionability.FAIL).toBe(0);
    const lmulm = rows.find((row) => row.id === 'lmulm');
    expect(lmulm?.hops.go).toBe('S3→S4');
    expect(lmulm?.hops.stop).toBe('S4→S3');
    expect(lmulm?.internal.stopClass).not.toBe('CONFLICT');
    expect(lmulm?.headlines.go).not.toBe(lmulm?.headlines.stop);
    expect(lmulm?.headlines.stop).not.toMatch(/가능성이 높음/);
  });
});
