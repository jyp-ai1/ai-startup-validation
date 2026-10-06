import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { pickSiIntegrationAnswer } from '../si-integration-answers';
import { getSiCalibrationCase } from '../si-calibration-cases';
import { resolveSiJourneyIntegration } from '../resolve-si-journey-integration';
import { appendFounderEvidenceToDocument } from '../update-strategic-intelligence';
import {
  declined,
  founderFour,
  isGenericAsk,
  questionTracksCuPriority,
  type PostNegSnap,
} from './score-si-post-negative-batch';
import {
  detectPattern,
  isNextUnresolvedCu,
  scoreSpokenAlignment,
  type HoldoutFailure,
  type HoldoutPattern,
} from './score-si-question-alignment-holdout';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-question-alignment-holdout.json',
);
const FREEZE_DUMP = true;
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

const HOLDOUT = {
  unnamed_omission: {
    title: undefined as string | undefined,
    documentText: `물류 센터는 출고 전 검수에서 누락이 14%에 달합니다.
기존 대안은 SAP 기본 검수 화면입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 3명이 월 구독을 결제했고 누락이 14%에서 6%로 줄었다.',
    negative: '유료 2곳이 해지했고 누락이 6%에서 18%로 늘었다.',
    expectedPattern: 'next_cu_generic' as HoldoutPattern,
  },
  unnamed_load: {
    title: undefined as string | undefined,
    documentText: `고객지원 팀은 티켓 부하가 41% 수준으로 몰립니다.
기존 대안은 Zendesk 매크로입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 4명이 연 계약을 결제했고 부하가 41%에서 19%로 줄었다.',
    negative: '유료 2곳이 해지했고 부하가 19%에서 44%로 늘었다.',
    expectedPattern: 'next_cu_generic' as HoldoutPattern,
  },
  unnamed_mismatch: {
    title: undefined as string | undefined,
    documentText: `중고 거래 카탈로그는 사진-실물 미스매치가 22%입니다.
기존 대안은 Notion 검수 체크리스트입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 2명이 구독을 결제했고 미스매치가 22%에서 10%로 줄었다.',
    negative: '유료 2곳이 해지했고 미스매치가 10%에서 25%로 늘었다.',
    expectedPattern: 'next_cu_generic' as HoldoutPattern,
  },
  unnamed_inconsistency: {
    title: undefined as string | undefined,
    documentText: `병원 청구 팀은 코드 불일치가 19%에 달합니다.
기존 대안은 EHR 기본 청구 모듈입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 6명이 월 구독을 결제했고 불일치가 19%에서 8%로 줄었다.',
    negative: '유료 2곳이 해지했고 불일치가 8%에서 21%로 늘었다.',
    expectedPattern: 'next_cu_generic' as HoldoutPattern,
  },
  unnamed_ledger: {
    title: undefined as string | undefined,
    documentText: `지방 세무 사무소는 신고 마감을 수기로 처리해 어렵습니다.
기존 대안은 범용 ERP입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 3명이 월 구독을 결제했고 유료 전환 2건이 발생했다.',
    negative: '유료 2곳이 해지했고 아무도 결제하지 않았다.',
    expectedPattern: 'stake_weave_off' as HoldoutPattern,
  },
  unnamed_fieldops: {
    title: undefined as string | undefined,
    documentText: `현장 점검 코디는 일정 조율을 메신저로 해서 불편합니다.
기존 대안은 Slack 리마인더입니다.
아직 출시되지 않았고 매출은 없습니다.`,
    upgrade: '결제 후보 1명이 분기 구독을 결제했고 유료 전환 1건이 발생했다.',
    negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    expectedPattern: 'stake_weave_off' as HoldoutPattern,
  },
} as const;

type HoldoutId =
  | keyof typeof HOLDOUT
  | 'clinicflow_alt'
  | 'fitbridge_alt'
  | 'juinjip_alt'
  | 'lmulm_alt'
  | 'ridm_alt';

function holdoutInput(id: HoldoutId): {
  title?: string;
  documentText: string;
  upgrade: string;
  negative: string;
  expectedPattern: HoldoutPattern;
} {
  if (id in HOLDOUT) return HOLDOUT[id as keyof typeof HOLDOUT];
  if (id === 'clinicflow_alt') {
    const fixture = getSiCalibrationCase('clinicflow');
    return {
      title: fixture.title,
      documentText: fixture.documentText,
      upgrade: '결제 후보 3명이 연 계약을 결제했고 no-show가 22%에서 12%로 줄었다.',
      negative: '유료 2곳이 해지했고 no-show가 12%에서 24%로 늘었다.',
      expectedPattern: 'next_cu_generic',
    };
  }
  if (id === 'fitbridge_alt') {
    const fixture = getSiCalibrationCase('fitbridge');
    return {
      title: fixture.title,
      documentText: fixture.documentText,
      upgrade: '결제 후보 5명이 위젯 구독을 결제했고 반품률이 38%에서 29%로 줄었다.',
      negative: '유료 2곳이 해지했고 반품률이 29%에서 41%로 늘었다.',
      expectedPattern: 'next_cu_generic',
    };
  }
  if (id === 'juinjip_alt') {
    const fixture = getSiCalibrationCase('juinjip');
    return {
      title: fixture.title,
      documentText: fixture.documentText,
      upgrade: '결제자 5명이 실제로 월 마케팅비를 결제했고 쓰는 사람이 아니라 그 결제자가 돈을 냈다.',
      negative: '결제자 5명이 모두 거절했고 아무도 마케팅비를 내지 않았다.',
      expectedPattern: 'control_bind',
    };
  }
  if (id === 'lmulm_alt') {
    const fixture = getSiCalibrationCase('lmulm');
    return {
      title: fixture.title,
      documentText: fixture.documentText,
      upgrade: '최근 구매자 60명 중 18명이 실제 재판매를 등록했고 7건이 거래됐다.',
      negative: '재판매는 멈췄고 재구매는 0건이다. 최근 구매자 중 아무도 등록하지 않았다.',
      expectedPattern: 'stake_weave_off',
    };
  }
  const fixture = getSiCalibrationCase('ridm');
  return {
    title: fixture.title,
    documentText: fixture.documentText,
    upgrade: '결제자 2명이 분기 구독을 결제했고 감정 기록 직무를 이 제품으로 대체했다.',
    negative: '결제 1건은 취소됐고 직무 대체는 확인되지 않았다.',
    expectedPattern: 'stake_weave_off',
  };
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

function scoreCase(id: HoldoutId) {
  const input = holdoutInput(id);
  const t0 = runTurns(input.title, input.documentText, [])[0]!;
  const upgraded = last(runTurns(input.title, input.documentText, [input.upgrade]));
  const downgraded = last(runTurns(input.title, input.documentText, [input.upgrade, input.negative]));
  const spoken = scoreSpokenAlignment(upgraded);
  const pattern = detectPattern(upgraded);
  const downBinds = questionTracksCuPriority(downgraded) && !isGenericAsk(downgraded);
  const fourDown = founderFour(downgraded);
  const failures: HoldoutFailure[] = [];
  if (spoken.failure) failures.push(spoken.failure);

  return {
    id,
    unnamed: id.startsWith('unnamed_'),
    expectedPattern: input.expectedPattern,
    observedPattern: pattern,
    hops: `${t0.stageId}→${upgraded.stageId}→${downgraded.stageId}`,
    t0Kind: t0.kind,
    promotion: {
      cu: upgraded.criticalUnknown,
      dce: upgraded.decisionChangingEvidence,
      priority: upgraded.validationPriority,
      kind: upgraded.kind,
      question: upgraded.question,
      nextUnknownCu: isNextUnresolvedCu(upgraded.criticalUnknown),
    },
    spoken: {
      score: spoken.score,
      note: spoken.note,
      failure: spoken.failure,
    },
    downgrade: {
      declined: declined(upgraded, downgraded),
      kind: downgraded.kind,
      binds: downBinds,
      leftoverPositive: fourDown.leftoverPositive,
    },
    failures: [...new Set(failures)],
  };
}

describe('S.I. Question Alignment Holdout — measure only', () => {
  it('does not rewrite analyzer, presenter, ask kind, or persist SoT', () => {
    expect(ANALYZER_SRC).toMatch(/function pickCriticalUnknown/);
    expect(ANALYZER_SRC).toMatch(/function decideStage/);
    expect(ANALYZER_SRC).toMatch(/function decideVerdict/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ASK_SRC).toMatch(/function detectSiValidationKind/);
    expect(ASK_SRC).toMatch(/return 'generic'/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}\n${ASK_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records next-CU generic vs stake weave-off on new input combinations', () => {
    const caseIds: HoldoutId[] = [
      'unnamed_omission',
      'unnamed_load',
      'unnamed_mismatch',
      'unnamed_inconsistency',
      'unnamed_ledger',
      'unnamed_fieldops',
      'clinicflow_alt',
      'fitbridge_alt',
      'juinjip_alt',
      'lmulm_alt',
      'ridm_alt',
    ];
    const rows = caseIds.map((id) => scoreCase(id));
    const spokenCounts = {
      PASS: rows.filter((row) => row.spoken.score === 'PASS').length,
      PARTIAL: rows.filter((row) => row.spoken.score === 'PARTIAL').length,
      FAIL: rows.filter((row) => row.spoken.score === 'FAIL').length,
    };
    const patternCounts = {
      next_cu_generic: rows.filter((row) => row.observedPattern === 'next_cu_generic').length,
      stake_weave_off: rows.filter((row) => row.observedPattern === 'stake_weave_off').length,
      control_bind: rows.filter((row) => row.observedPattern === 'control_bind').length,
    };
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

    const omission = scoreCase('unnamed_omission');
    const paidOnly = last(
      runTurns(undefined, HOLDOUT.unnamed_omission.documentText, [
        pickSiIntegrationAnswer('paid_conversion', 'validated'),
      ]),
    );

    if (!FREEZE_DUMP) {
      mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
      writeFileSync(
        SNAPSHOT_PATH,
        `${JSON.stringify(
          {
            productionSha: PRODUCTION_SHA,
            fixBatch2Sha: FIX_SHA,
            scenarioCount: rows.length,
            spokenCounts,
            patternCounts,
            failureCounts,
            repeated,
            oneOff,
            regression: {
              paymentOnlyOffS3: paidOnly.stageId !== 'S3' && paidOnly.stageId !== 'S4',
              twoTwoNextCu: omission.promotion.nextUnknownCu,
              negativeDeclined: rows.every((row) => row.downgrade.declined),
              leftoverPositive: rows.filter((row) => row.downgrade.leftoverPositive).length,
              negativeQuestionBinds: rows.filter((row) => row.downgrade.binds).length,
            },
            rows,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }

    expect(rows).toHaveLength(11);
    expect(rows.filter((row) => row.unnamed)).toHaveLength(6);
    expect(paidOnly.stageId).not.toBe('S3');
    expect(omission.promotion.nextUnknownCu).toBe(true);
    expect(rows.every((row) => row.downgrade.leftoverPositive === false)).toBe(true);
  });
});
