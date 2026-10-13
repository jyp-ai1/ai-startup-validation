/**
 * PR #197 follow-up — S1–S6 strategy quality, not 8-turn reach.
 * Measures whether answers change understanding → evidence → judgment → next action.
 * Does not lower Track A / AC16 / AC5 / FIX-10 expectations.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import {
  ACCURATE_CHOICE_LABEL,
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
  type BusinessChoiceOption,
} from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { decideNextQuestionFromReview } from '../decide-next-question-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { shouldBlockSolutionBeforeIdentity } from '../resolve-turn-decision';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const OUT = path.join(
  process.cwd(),
  '../../docs/evidence/ALABOM/AI-PM/PR197-CPO-S1-S6-STRATEGY-QUALITY-DUMP.json',
);
const IMPLEMENTATION_SHA = 'bcf443b7';

const DOCS = {
  S1: `# 소상공인 배송 SaaS
서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`,
  S2: `# 전통주 브랜드
서비스: 소규모 양조장 전통주를 브랜드로 묶어 온라인·팝업으로 판매
대상: 전통주를 선물·취미로 찾는 30–40대
문제: 양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다
수익: 제품 판매 + 양조장 입점 수수료`,
  S3: `# 견적 자동화
서비스: 중소 제조사의 견적·발주 메일을 읽어 엑셀 발주서를 자동으로 채우는 툴
대상: 직원 20–80명 제조사 영업관리자
문제: 메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다
수익: 좌석 월 구독`,
  S4: `# 구독 박스
서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`,
  S5: `# 단백질 쿠키
서비스: 단백질 쿠키를 자사몰에서 팝니다
대상: 운동하는 20–30대
문제: 시중 단백질바는 맛없거나 비싸다
수익: 제품 판매`,
  S6: `# 가사 중개
서비스: 가사 도우미와 맞벌이 집을 연결하는 중개 앱
대상: 맞벌이 가정 / 도우미
문제: 믿을 사람을 찾기 어렵고, 도우미는 일감이 불안정하다
수익: 거래 수수료`,
} as const;

type ScenarioId = keyof typeof DOCS;

const IDENTITY: Record<
  ScenarioId,
  { keep: RegExp; reviseMatch: RegExp; revise: { label: string; answerText: string } }
> = {
  S1: {
    keep: /반찬|꽃집|소상공/,
    reviseMatch: /대기업|물류/,
    revise: {
      label: '대기업 물류본부',
      answerText: '이 서비스를 가장 필요로 하는 사람은 대기업 물류본부입니다.',
    },
  },
  S2: {
    keep: /30|40|선물|전통주/,
    reviseMatch: /20대|혼자/,
    revise: {
      label: '혼자 마시는 20대',
      answerText: '이 브랜드를 가장 필요로 하는 사람은 혼자 마시는 20대입니다.',
    },
  },
  S3: {
    keep: /영업|관리자|제조/,
    reviseMatch: /프리랜서/,
    revise: {
      label: '개인 프리랜서',
      answerText: '이 툴을 가장 필요로 하는 사람은 개인 프리랜서입니다.',
    },
  },
  S4: {
    keep: /맞벌이|부모|아이/,
    reviseMatch: /20대|혼자/,
    revise: {
      label: '혼자 사는 20대',
      answerText: '이 서비스를 가장 필요로 하는 사람은 혼자 사는 20대입니다.',
    },
  },
  S5: {
    keep: /20|30|운동|헬스/,
    reviseMatch: /초등|부모/,
    revise: {
      label: '간식 찾는 초등학생 부모',
      answerText: '이 쿠키를 가장 필요로 하는 사람은 간식 찾는 초등학생 부모입니다.',
    },
  },
  S6: {
    keep: /맞벌이|집|가정|도우미/,
    reviseMatch: /대학생|1인/,
    revise: {
      label: '1인 가구 대학생',
      answerText: '이 앱을 가장 필요로 하는 사람은 1인 가구 대학생입니다.',
    },
  },
};

const PAYMENT_YES: BusinessChoiceOption = {
  id: 'pay-yes',
  label: '실제 결제 증거가 있습니다',
  answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
  kind: 'specific',
  appliesToGap: 'validationTestability',
  evidenceClassHint: 'ASSUMPTION',
};

const PAYMENT_NONE: BusinessChoiceOption = {
  id: 'pay-none',
  label: '아직 없다',
  answerText: '아직 실제 결제·사용 증거는 없습니다.',
  kind: 'specific',
  appliesToGap: 'validationTestability',
  evidenceClassHint: 'UNKNOWN',
};

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function reset(projectId: string, documentText: string) {
  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'answer',
      currentIssueId: 'problem_definition',
      ceoJudgment: emptyCeoJudgmentState(0),
    },
    projectId,
  );
}

function livingFrom(documentText: string, projectId: string) {
  const loop = loadAiPmLoopState(projectId);
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
  });
}

function firstAsk(projectId: string, documentText: string) {
  const living = livingFrom(documentText, projectId);
  const gapState = loadAiPmLoopState(projectId).gapState ?? createEmptyGapState();
  const bootstrap = decideNextQuestionFromReview({
    living,
    turns: [],
    memory: null,
    lastReview: null,
    gapState,
    stageReadiness: evaluateStageReadiness({ gapState }),
  });
  const targetGap = bootstrap?.targetGapId ?? 'customerPersona';
  const asked = buildBusinessChoiceQuestion({
    living,
    documentText,
    targetGap,
  });
  return { bootstrap, asked, targetGap };
}

function pickAccurate(options: BusinessChoiceOption[]): BusinessChoiceOption | undefined {
  return (
    options.find((o) => o.kind === 'accurate' || o.label === ACCURATE_CHOICE_LABEL) ??
    options.find((o) => o.kind === 'specific')
  );
}

function pickUnknown(options: BusinessChoiceOption[]): BusinessChoiceOption | undefined {
  return options.find((o) => o.kind === 'unknown' || o.label === UNKNOWN_CHOICE_LABEL);
}

function reviseOption(scenario: ScenarioId, targetGap: string): BusinessChoiceOption {
  const fallback = IDENTITY[scenario].revise;
  return {
    id: `${scenario}-revise`,
    label: fallback.label,
    answerText: fallback.answerText,
    kind: 'specific',
    appliesToGap: targetGap,
    evidenceClassHint: 'ASSUMPTION',
  };
}

function lastEvidenceClasses(projectId: string): string[] {
  const turns = loadAiPmLoopState(projectId).turns;
  const review = [...turns].reverse().find((t) => t.review)?.review;
  return (review?.extractedFacts ?? []).map((f) => f.evidenceClass);
}

function snapshotAfter(
  projectId: string,
  result: ReturnType<typeof applyBusinessChoiceThroughLoop>,
) {
  const loop = loadAiPmLoopState(projectId);
  const completeness = {
    customerPersona: loop.gapState?.gaps.customerPersona?.completeness ?? 'OPEN',
    problemJtbd: loop.gapState?.gaps.problemJtbd?.completeness ?? 'OPEN',
    payer: loop.gapState?.gaps.payer?.completeness ?? 'OPEN',
    validationTestability:
      loop.gapState?.gaps.validationTestability?.completeness ?? 'OPEN',
  };
  const evidenceClasses = lastEvidenceClasses(projectId);
  return {
    before: {
      spine: result.livingBefore.spine,
      judgmentConclusion: result.judgmentBefore?.conclusion ?? null,
      customerStatus: result.judgmentBefore?.dimensions.customer.status ?? 'unknown',
      problemStatus: result.judgmentBefore?.dimensions.problem.status ?? 'unknown',
    },
    after: {
      spine: result.livingAfter.spine,
    },
    founderAnswer: result.resolved.answerText,
    spine: result.livingAfter.spine,
    completeness,
    evidenceClasses,
    evidenceHasFact: evidenceClasses.includes('FACT'),
    evidenceHasValidated: evidenceClasses.includes('VALIDATED'),
    gapEvidence: {
      customerPersona:
        loop.gapState?.gaps.customerPersona?.evidence?.[0]?.evidenceClass ?? null,
      problemJtbd: loop.gapState?.gaps.problemJtbd?.evidence?.[0]?.evidenceClass ?? null,
      validationTestability:
        loop.gapState?.gaps.validationTestability?.evidence?.[0]?.evidenceClass ?? null,
    },
    judgment: {
      conclusion: result.judgmentAfter.conclusion,
      customerStatus: result.judgmentAfter.dimensions.customer.status,
      customerSummary: result.judgmentAfter.dimensions.customer.summary,
      customerChangeStatus: result.judgmentAfter.dimensions.customerChange.status,
      customerChangeReason: result.judgmentAfter.dimensions.customerChange.statusReason ?? '',
      customerChangeSummary: result.judgmentAfter.dimensions.customerChange.summary,
      problemStatus: result.judgmentAfter.dimensions.problem.status,
    },
    next: {
      targetGap: result.nextTargetGap,
      question: result.nextQuestionText,
      whyNow: result.nextWhyNow,
      validationAction: result.nextValidationAction,
    },
  };
}

function axisPass(pass: boolean, evidence: string) {
  return { pass, evidence };
}

describe('PR #197 S1–S6 strategy quality', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
  });

  it('records understanding → evidence → judgment → next-action divergence for S1–S6', () => {
    const scenarios: Record<string, unknown> = {};
    const ids = Object.keys(DOCS) as ScenarioId[];

    for (const id of ids) {
      const doc = DOCS[id];
      const surfaceId = `sq-${id}-surface`;
      reset(surfaceId, doc);
      const first = firstAsk(surfaceId, doc);
      const firstQuestion = first.asked.questionText;
      const d7 =
        first.asked.mode === 'understanding-verification' &&
        !/제가 이해한 사업은 「/.test(firstQuestion) &&
        first.bootstrap?.targetGapId !== 'businessOneLiner';
      const d4 =
        first.targetGap !== 'solution' &&
        shouldBlockSolutionBeforeIdentity(
          loadAiPmLoopState(surfaceId).gapState ?? createEmptyGapState(),
        );

      const confirmId = `sq-${id}-confirm`;
      const reviseId = `sq-${id}-revise`;
      const unknownId = `sq-${id}-unknown`;
      reset(confirmId, doc);
      reset(reviseId, doc);
      reset(unknownId, doc);

      const confirmAsk = firstAsk(confirmId, doc);
      const accurate = pickAccurate(confirmAsk.asked.options);
      const unknown = pickUnknown(confirmAsk.asked.options);
      const revise = reviseOption(id, confirmAsk.targetGap);

      const afterConfirm = applyBusinessChoiceThroughLoop({
        projectId: confirmId,
        documentText: doc,
        option: accurate!,
        askedQuestionText: confirmAsk.asked.questionText,
      });
      const afterRevise = applyBusinessChoiceThroughLoop({
        projectId: reviseId,
        documentText: doc,
        option: { ...revise, appliesToGap: confirmAsk.targetGap },
        askedQuestionText: confirmAsk.asked.questionText,
      });
      const afterUnknown = applyBusinessChoiceThroughLoop({
        projectId: unknownId,
        documentText: doc,
        option: unknown!,
        askedQuestionText: confirmAsk.asked.questionText,
      });

      const confirmSnap = snapshotAfter(confirmId, afterConfirm);
      const reviseSnap = snapshotAfter(reviseId, afterRevise);
      const unknownSnap = snapshotAfter(unknownId, afterUnknown);

      const yesId = `sq-${id}-pay-yes`;
      const noneId = `sq-${id}-pay-none`;
      reset(yesId, doc);
      reset(noneId, doc);
      applyBusinessChoiceThroughLoop({
        projectId: yesId,
        documentText: doc,
        option: accurate!,
        askedQuestionText: confirmAsk.asked.questionText,
      });
      applyBusinessChoiceThroughLoop({
        projectId: noneId,
        documentText: doc,
        option: accurate!,
        askedQuestionText: confirmAsk.asked.questionText,
      });
      const afterYes = applyBusinessChoiceThroughLoop({
        projectId: yesId,
        documentText: doc,
        option: PAYMENT_YES,
      });
      const afterNone = applyBusinessChoiceThroughLoop({
        projectId: noneId,
        documentText: doc,
        option: PAYMENT_NONE,
      });
      const yesSnap = snapshotAfter(yesId, afterYes);
      const noneSnap = snapshotAfter(noneId, afterNone);

      const reviseInstalled = IDENTITY[id].reviseMatch.test(reviseSnap.spine.customer);
      const confirmKept = IDENTITY[id].keep.test(confirmSnap.spine.customer);
      const understandingChanged =
        confirmKept &&
        reviseInstalled &&
        confirmSnap.spine.customer !== reviseSnap.spine.customer;
      const confirmClosedAsked = confirmSnap.completeness.customerPersona === 'CLOSED';
      const unknownStaysOpen = unknownSnap.completeness.customerPersona !== 'CLOSED';
      const confirmNotFact = confirmSnap.evidenceClasses.every((c) => c !== 'FACT');
      const unknownNotFact = unknownSnap.evidenceClasses.every((c) => c !== 'FACT');
      const paymentNotFact =
        yesSnap.evidenceClasses.every((c) => c !== 'FACT') &&
        noneSnap.evidenceClasses.every((c) => c !== 'FACT') &&
        yesSnap.completeness.validationTestability !== 'CLOSED' &&
        noneSnap.completeness.validationTestability !== 'CLOSED';
      const evidenceStrengthChanged =
        yesSnap.judgment.customerChangeReason !== noneSnap.judgment.customerChangeReason ||
        yesSnap.judgment.customerChangeSummary !== noneSnap.judgment.customerChangeSummary ||
        yesSnap.gapEvidence.validationTestability !== noneSnap.gapEvidence.validationTestability;
      const judgmentDiverged =
        yesSnap.judgment.conclusion !== noneSnap.judgment.conclusion ||
        yesSnap.judgment.customerChangeStatus !== noneSnap.judgment.customerChangeStatus ||
        yesSnap.judgment.customerChangeReason !== noneSnap.judgment.customerChangeReason ||
        yesSnap.judgment.customerChangeSummary !== noneSnap.judgment.customerChangeSummary;
      const nextAfterUnderstandingDiverged =
        confirmSnap.next.validationAction !== unknownSnap.next.validationAction ||
        confirmSnap.next.validationAction !== reviseSnap.next.validationAction ||
        confirmSnap.next.whyNow !== unknownSnap.next.whyNow ||
        confirmSnap.next.whyNow !== reviseSnap.next.whyNow;
      const nextAfterEvidenceDiverged =
        yesSnap.next.targetGap !== noneSnap.next.targetGap ||
        yesSnap.next.question !== noneSnap.next.question ||
        yesSnap.next.validationAction !== noneSnap.next.validationAction;
      const unknownEscapesIdentity = ['alternativesCompetitors', 'solution', 'marketChannel'].includes(
        unknownSnap.next.targetGap ?? '',
      );
      const noSolutionWhileOpen =
        confirmSnap.next.targetGap !== 'solution' &&
        reviseSnap.next.targetGap !== 'solution' &&
        unknownSnap.next.targetGap !== 'solution';

      const axes = {
        understandingRevision: axisPass(
          understandingChanged,
          `confirm.customer="${confirmSnap.spine.customer}" revise.customer="${reviseSnap.spine.customer}" reviseInstalled=${reviseInstalled}`,
        ),
        evidenceClass: axisPass(
          confirmNotFact && unknownNotFact && paymentNotFact && evidenceStrengthChanged,
          `confirmFacts=${confirmSnap.evidenceClasses.join(',') || 'none'}; yesReason="${yesSnap.judgment.customerChangeReason}"; noneReason="${noneSnap.judgment.customerChangeReason}"; validationYes=${yesSnap.gapEvidence.validationTestability}; validationNone=${noneSnap.gapEvidence.validationTestability}`,
        ),
        completeness: axisPass(
          confirmClosedAsked && unknownStaysOpen,
          `confirm=${JSON.stringify(confirmSnap.completeness)} unknown=${JSON.stringify(unknownSnap.completeness)}`,
        ),
        judgment: axisPass(
          judgmentDiverged,
          `yes="${yesSnap.judgment.conclusion.slice(0, 80)}" none="${noneSnap.judgment.conclusion.slice(0, 80)}" reasonYes="${yesSnap.judgment.customerChangeReason}" reasonNone="${noneSnap.judgment.customerChangeReason}"`,
        ),
        nextAfterUnderstanding: axisPass(
          nextAfterUnderstandingDiverged,
          `confirmNext=${confirmSnap.next.targetGap} reviseNext=${reviseSnap.next.targetGap} unknownNext=${unknownSnap.next.targetGap} confirmWhy="${confirmSnap.next.whyNow}" reviseWhy="${reviseSnap.next.whyNow}" unknownWhy="${unknownSnap.next.whyNow}"`,
        ),
        nextAfterEvidence: axisPass(
          nextAfterEvidenceDiverged,
          `yesNext=${yesSnap.next.targetGap} noneNext=${noneSnap.next.targetGap} yesAction="${yesSnap.next.validationAction}" noneAction="${noneSnap.next.validationAction}"`,
        ),
        unknownKeepsIdentityAskable: axisPass(
          !unknownEscapesIdentity,
          `unknownNext=${unknownSnap.next.targetGap} customerCompleteness=${unknownSnap.completeness.customerPersona}`,
        ),
      };
      const failedAxes = Object.entries(axes)
        .filter(([, v]) => !v.pass)
        .map(([k]) => k);
      const scenarioStatus =
        failedAxes.length === 0 ? 'PASS' : failedAxes.length <= 3 ? 'NEEDS FIX' : 'FAIL';

      scenarios[id] = {
        status: scenarioStatus,
        firstSurface: {
          targetGap: first.targetGap,
          mode: first.asked.mode,
          question: firstQuestion,
          d7NoDocumentEchoConfirmYes: d7,
          d4NoSolutionFirst: d4,
        },
        branches: {
          confirm: confirmSnap,
          revise: reviseSnap,
          unknown: unknownSnap,
          paymentYes: yesSnap,
          paymentNone: noneSnap,
        },
        axes,
        failedAxes,
        noSolutionWhileIdentityOpen: noSolutionWhileOpen,
      };
    }

    const statuses = ids.map((id) => (scenarios[id] as { status: string }).status);
    const overallStatus = statuses.every((s) => s === 'PASS')
      ? 'PASS'
      : statuses.some((s) => s === 'FAIL')
        ? 'NEEDS FIX'
        : 'NEEDS FIX';

    const dump = {
      meta: {
        implementationSha: IMPLEMENTATION_SHA,
        executedSha: gitSha(),
        executedAt: new Date().toISOString(),
        note:
          'Success is answer-dependent understanding, evidence, completeness, judgment, and next-action reason. 8-turn reach is not success. Track A FAIL, Track B NEEDS FIX, AC16/AC5 FAIL are not rewritten here.',
        production: 'NOT VERIFIED',
        loginUiEightTurn: 'NOT VERIFIED',
        googleOauth: 'NOT VERIFIED',
        mergeRequest: 'none',
      },
      overallStatus,
      scenarioStatuses: Object.fromEntries(ids.map((id) => [id, (scenarios[id] as { status: string }).status])),
      scenarios,
    };

    mkdirSync(path.dirname(OUT), { recursive: true });
    writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);

    for (const id of ids) {
      const row = scenarios[id] as {
        firstSurface: { d7NoDocumentEchoConfirmYes: boolean; d4NoSolutionFirst: boolean };
        noSolutionWhileIdentityOpen: boolean;
      };
      expect(row.firstSurface.d7NoDocumentEchoConfirmYes, `${id} D7`).toBe(true);
      expect(row.firstSurface.d4NoSolutionFirst, `${id} D4 first`).toBe(true);
      expect(row.noSolutionWhileIdentityOpen, `${id} D4 next`).toBe(true);
    }
    expect(ids).toHaveLength(6);
    expect(overallStatus).toMatch(/PASS|NEEDS FIX|FAIL/);
    const s1 = scenarios.S1 as {
      branches: {
        confirm: { next: { whyNow: string | null }; evidenceHasFact: boolean };
        revise: { next: { whyNow: string | null }; spine: { customer: string } };
        unknown: { next: { whyNow: string | null }; completeness: { customerPersona: string } };
      };
    };
    expect(s1.branches.confirm.evidenceHasFact).toBe(false);
    expect(s1.branches.confirm.next.whyNow ?? '').toContain('검증된 사실이 아닙니다');
    expect(s1.branches.revise.next.whyNow ?? '').toContain('고객 가설이 바뀌었습니다');
    expect(s1.branches.unknown.next.whyNow ?? '').toContain('아직 확정되지 않았고');
    expect(s1.branches.unknown.completeness.customerPersona).not.toBe('CLOSED');
    expect(s1.branches.revise.spine.customer).toMatch(/대기업|물류/);
  }, 120_000);
});
