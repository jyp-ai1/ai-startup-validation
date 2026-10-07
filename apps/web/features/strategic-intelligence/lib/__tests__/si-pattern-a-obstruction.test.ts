import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import { declined, founderFour, isGenericAsk } from './score-si-post-negative-batch';
import { isNextUnresolvedCu } from './score-si-question-alignment-holdout';
import {
  recoversNextCuOnSurface,
  scoreFollowUp,
  scoreObstruction,
  type ObstructionSnap,
} from './score-si-pattern-a-obstruction';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-pattern-a-obstruction.json',
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
const ALIGNMENT_FIX_SHA = '6926d6ffc108f677fcc274ca4523ebfb71ac2351';

const PATTERN_A = {
  unnamed_omission: {
    title: undefined as string | undefined,
    documentText: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    onCu: '다음 기간에도 누락이 6%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    negative: '유료 2곳이 해지했고 누락이 6%에서 18%로 늘었다.',
  },
  unnamed_load: {
    title: undefined as string | undefined,
    documentText: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 Zendesk 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    onCu: '다음 기간에도 부하가 19%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    negative: '유료 2곳이 해지했고 부하가 19%에서 44%로 늘었다.',
  },
  unnamed_mismatch: {
    title: undefined as string | undefined,
    documentText: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 Notion 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    onCu: '다음 기간에도 미스매치가 10%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    negative: '유료 2곳이 해지했고 미스매치가 10%에서 25%로 늘었다.',
  },
  unnamed_inconsistency: {
    title: undefined as string | undefined,
    documentText: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    onCu: '다음 기간에도 불일치가 8%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    negative: '유료 2곳이 해지했고 불일치가 8%에서 21%로 늘었다.',
  },
} as const;

type PatternAId =
  | keyof typeof PATTERN_A
  | 'clinicflow_alt'
  | 'fitbridge_alt';

function patternAInput(id: PatternAId): {
  title?: string;
  documentText: string;
  upgrade: string;
  onCu: string;
  negative: string;
} {
  if (id in PATTERN_A) return PATTERN_A[id as keyof typeof PATTERN_A];
  if (id === 'clinicflow_alt') {
    const fixture = getSiCalibrationCase('clinicflow');
    return {
      title: fixture.title,
      documentText: fixture.documentText,
      upgrade: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
      onCu: '다음 기간에도 no-show가 12%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
      negative: '유료 2곳이 해지했고 no-show가 12%에서 24%로 늘었다.',
    };
  }
  const fixture = getSiCalibrationCase('fitbridge');
  return {
    title: fixture.title,
    documentText: fixture.documentText,
    upgrade: '결제 후보 5명이 위젯 구독을 결제했고 반품률이 38%에서 29%로 줄었다.',
    onCu: '다음 기간에도 반품률이 29%로 유지됐고, 다음 고객 2곳에서도 같은 방향으로 줄었다.',
    negative: '유료 2곳이 해지했고 반품률이 29%에서 41%로 늘었다.',
  };
}

function snap(view: ReturnType<typeof resolveSiJourneyIntegration>): ObstructionSnap {
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
  const turns: ObstructionSnap[] = [];
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

function last(turns: ObstructionSnap[]): ObstructionSnap {
  return turns[turns.length - 1]!;
}

function scoreCase(id: PatternAId) {
  const input = patternAInput(id);
  const ask = last(runTurns(input.title, input.documentText, [input.upgrade]));
  const onCuSnap = last(runTurns(input.title, input.documentText, [input.upgrade, input.onCu]));
  const genericSnap = last(
    runTurns(input.title, input.documentText, [
      input.upgrade,
      pickSiIntegrationAnswer('generic', 'validated'),
    ]),
  );
  const wrongSnap = last(
    runTurns(input.title, input.documentText, [
      input.upgrade,
      pickSiIntegrationAnswer('repeat_loop', 'validated'),
    ]),
  );
  const planSnap = last(
    runTurns(input.title, input.documentText, [
      input.upgrade,
      pickSiIntegrationAnswer('generic', 'intent'),
    ]),
  );
  const negative = last(runTurns(input.title, input.documentText, [input.upgrade, input.negative]));

  const onCu = scoreFollowUp('on_cu', ask, onCuSnap);
  const genericLiteral = scoreFollowUp('generic_literal', ask, genericSnap);
  const wrongAxis = scoreFollowUp('wrong_axis', ask, wrongSnap);
  const planOnly = scoreFollowUp('plan_only', ask, planSnap);
  const obstruction = scoreObstruction({ ask, onCu, genericLiteral, wrongAxis, planOnly });

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    ask: {
      stageId: ask.stageId,
      verdictId: ask.verdictId,
      cu: ask.criticalUnknown,
      priority: ask.validationPriority,
      kind: ask.kind,
      question: ask.question,
      whyAsking: ask.whyAsking,
      nextUnknownCu: isNextUnresolvedCu(ask.criticalUnknown),
      genericAsk: isGenericAsk(ask),
      surfaceRecovers: recoversNextCuOnSurface(ask),
    },
    branches: {
      on_cu: {
        answer: input.onCu,
        stageId: onCuSnap.stageId,
        cu: onCuSnap.criticalUnknown,
        kind: onCuSnap.kind,
        ...onCu,
      },
      generic_literal: {
        answer: pickSiIntegrationAnswer('generic', 'validated'),
        stageId: genericSnap.stageId,
        cu: genericSnap.criticalUnknown,
        kind: genericSnap.kind,
        ...genericLiteral,
      },
      wrong_axis: {
        answer: pickSiIntegrationAnswer('repeat_loop', 'validated'),
        stageId: wrongSnap.stageId,
        cu: wrongSnap.criticalUnknown,
        kind: wrongSnap.kind,
        ...wrongAxis,
      },
      plan_only: {
        answer: pickSiIntegrationAnswer('generic', 'intent'),
        stageId: planSnap.stageId,
        cu: planSnap.criticalUnknown,
        kind: planSnap.kind,
        ...planOnly,
      },
    },
    obstruction,
    negative: {
      declined: declined(ask, negative),
      leftoverPositive: founderFour(negative).leftoverPositive,
    },
  };
}

describe('S.I. Pattern A obstruction — measure only', () => {
  it('does not rewrite analyzer, presenter, ask kind, or persist SoT', () => {
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(PRESENTER_SRC).toMatch(/stakeFromAsk\(ask\.criticalUnknown\)/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(ASK_SRC).toMatch(/return 'generic'/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records whether generic next-CU asks obstruct Founder validation', () => {
    const caseIds: PatternAId[] = [
      'unnamed_omission',
      'unnamed_load',
      'unnamed_mismatch',
      'unnamed_inconsistency',
      'clinicflow_alt',
      'fitbridge_alt',
    ];
    const rows = caseIds.map((id) => scoreCase(id));
    const obstructionCounts = {
      PASS: rows.filter((row) => row.obstruction.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.obstruction.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.obstruction.score === 'FAIL').length,
    };
    const branchCounts = {
      on_cu: {
        PASS: rows.filter((row) => row.branches.on_cu.score === 'PASS').length,
        PARTIAL: rows.filter((row) => row.branches.on_cu.score === 'PARTIAL').length,
        FAIL: rows.filter((row) => row.branches.on_cu.score === 'FAIL').length,
      },
      generic_literal: {
        PASS: rows.filter((row) => row.branches.generic_literal.score === 'PASS').length,
        PARTIAL: rows.filter((row) => row.branches.generic_literal.score === 'PARTIAL').length,
        FAIL: rows.filter((row) => row.branches.generic_literal.score === 'FAIL').length,
      },
      wrong_axis: {
        PASS: rows.filter((row) => row.branches.wrong_axis.score === 'PASS').length,
        PARTIAL: rows.filter((row) => row.branches.wrong_axis.score === 'PARTIAL').length,
        FAIL: rows.filter((row) => row.branches.wrong_axis.score === 'FAIL').length,
      },
      plan_only: {
        PASS: rows.filter((row) => row.branches.plan_only.score === 'PASS').length,
        PARTIAL: rows.filter((row) => row.branches.plan_only.score === 'PARTIAL').length,
        FAIL: rows.filter((row) => row.branches.plan_only.score === 'FAIL').length,
      },
    };
    const failureCounts: Record<string, number> = {};
    for (const row of rows) {
      if (row.obstruction.failure) {
        failureCounts[row.obstruction.failure] = (failureCounts[row.obstruction.failure] ?? 0) + 1;
      }
    }

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          alignmentFixSha: ALIGNMENT_FIX_SHA,
          scenarioCount: rows.length,
          obstructionCounts,
          branchCounts,
          failureCounts,
          regression: {
            patternA: rows.every((row) => row.ask.nextUnknownCu && row.ask.genericAsk),
            surfaceRecovers: rows.filter((row) => row.ask.surfaceRecovers).length,
            negativeDeclined: rows.filter((row) => row.negative.declined).length,
            leftoverPositive: rows.filter((row) => row.negative.leftoverPositive).length,
          },
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(6);
    expect(rows.filter((row) => row.unnamed)).toHaveLength(4);
    expect(rows.every((row) => row.ask.nextUnknownCu)).toBe(true);
    expect(rows.every((row) => row.ask.genericAsk)).toBe(true);
    expect(rows.every((row) => row.negative.leftoverPositive === false)).toBe(true);
  });
});
