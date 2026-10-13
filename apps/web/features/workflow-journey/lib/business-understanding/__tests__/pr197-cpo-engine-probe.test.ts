/**
 * PR #197 CPO engine probe — records actual apply-path I/O.
 * Does not assert desired scenario outcomes (those remain FAIL / NOT VERIFIED).
 * Product engines are not modified.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import {
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
  type BusinessChoiceOption,
} from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const OUT = '/tmp/pr197-cpo-engine-probe.json';

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

function livingNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
  });
}

function asked(projectId: string, documentText: string, targetGap: string) {
  return buildBusinessChoiceQuestion({
    living: livingNow(projectId, documentText),
    documentText,
    targetGap,
  });
}

function pick(
  options: BusinessChoiceOption[],
  kind: 'specific' | 'unknown' | 'other',
  pattern?: RegExp,
): BusinessChoiceOption {
  if (kind === 'unknown') {
    return options.find((o) => o.kind === 'unknown' || o.label === UNKNOWN_CHOICE_LABEL)!;
  }
  if (kind === 'other') {
    return options.find((o) => o.kind === 'other')!;
  }
  return (
    options.find((o) => o.kind === 'specific' && (!pattern || pattern.test(o.label))) ??
    options.find((o) => o.kind === 'specific')!
  );
}

function snapshot(projectId: string, result: ReturnType<typeof applyBusinessChoiceThroughLoop>) {
  const loop = loadAiPmLoopState(projectId);
  const last = loop.turns.at(-1);
  return {
    persisted: result.persisted,
    applied: result.applied,
    intent: last?.intent ?? null,
    askedGap: last?.targetGap ?? null,
    answer: last?.answer ?? result.resolved.answerText,
    nextTargetGap: result.nextTargetGap,
    nextQuestionText: result.nextQuestionText,
    nextWhyNow: result.nextWhyNow,
    lastDecisionType: loop.lastDecision?.questionType ?? null,
    lastConfirmGap: loop.lastDecision?.confirmGapId ?? null,
    conclusion: result.judgmentAfter.conclusion,
    dims: {
      customer: result.judgmentAfter.dimensions.customer.status,
      problem: result.judgmentAfter.dimensions.problem.status,
      solution: result.judgmentAfter.dimensions.solution.status,
      customerChange: result.judgmentAfter.dimensions.customerChange.status,
      customerChangeEvidence: result.judgmentAfter.dimensions.customerChange.evidenceType ?? null,
    },
    claims: livingNow(projectId, '').claims
      ? undefined
      : undefined,
    memoryBuyer: null as string | null,
  };
}

function applyGap(
  projectId: string,
  documentText: string,
  targetGap: string,
  kind: 'specific' | 'unknown' | 'other',
  pattern?: RegExp,
  freeText?: string,
) {
  const question = asked(projectId, documentText, targetGap);
  const option = pick(question.options, kind, pattern);
  const result = applyBusinessChoiceThroughLoop({
    projectId,
    documentText,
    option,
    freeText,
    askedQuestionText: question.questionText,
  });
  return {
    asked: {
      gap: targetGap,
      question: question.questionText,
      labels: question.options.map((o) => o.label),
      picked: option.label,
    },
    ...snapshot(projectId, result),
    optionLabels: question.options.filter((o) => o.kind === 'specific').map((o) => o.label),
  };
}

function followEngine(projectId: string, documentText: string, maxTurns: number) {
  const turns: ReturnType<typeof applyGap>[] = [];
  let gap = 'problemJtbd';
  for (let i = 0; i < maxTurns; i += 1) {
    const q = asked(projectId, documentText, gap);
    const specific = q.options.find((o) => o.kind === 'specific');
    const result = applyBusinessChoiceThroughLoop({
      projectId,
      documentText,
      option: specific ?? q.options[0]!,
      askedQuestionText: q.questionText,
    });
    const row = {
      asked: {
        gap,
        question: q.questionText,
        labels: q.options.map((o) => o.label),
        picked: (specific ?? q.options[0]!).label,
      },
      ...snapshot(projectId, result),
      optionLabels: q.options.filter((o) => o.kind === 'specific').map((o) => o.label),
    };
    turns.push(row);
    if (!result.nextTargetGap || result.nextTargetGap === gap) break;
    gap = result.nextTargetGap;
  }
  return turns;
}

describe('PR #197 CPO engine probe', () => {
  const evidence: Record<string, unknown> = {};

  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('records R1–R4, guards, and S1–S6 engine turns', () => {
    // R1: problem then customer on S1
    reset('r1', DOCS.S1);
    const r1Problem = applyGap('r1', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    const r1Customer = applyGap('r1', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    evidence.R1 = {
      afterProblem: r1Problem,
      afterCustomer: r1Customer,
    };

    // R2: payment evidence present vs absent
    reset('r2-yes', DOCS.S1);
    const r2Yes = applyBusinessChoiceThroughLoop({
      projectId: 'r2-yes',
      documentText: DOCS.S1,
      option: {
        id: 'validationTestability-opt-1',
        label: '실제 결제나 사용 증거가 있습니다',
        answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    reset('r2-no', DOCS.S1);
    const r2No = applyBusinessChoiceThroughLoop({
      projectId: 'r2-no',
      documentText: DOCS.S1,
      option: {
        id: 'validationTestability-opt-2',
        label: '아직 실제 결제·사용 증거는 없습니다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    });
    evidence.R2 = {
      withEvidence: snapshot('r2-yes', r2Yes),
      withoutEvidence: snapshot('r2-no', r2No),
      sameConclusion: r2Yes.judgmentAfter.conclusion === r2No.judgmentAfter.conclusion,
      sameCustomerChange:
        r2Yes.judgmentAfter.dimensions.customerChange.status ===
        r2No.judgmentAfter.dimensions.customerChange.status,
    };

    // R3: whyNow after customer is known
    reset('r3', DOCS.S1);
    applyGap('r3', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    const r3AfterCustomer = applyGap('r3', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    evidence.R3 = {
      afterCustomerNext: r3AfterCustomer.nextQuestionText,
      afterCustomerWhy: r3AfterCustomer.nextWhyNow,
      afterCustomerGap: r3AfterCustomer.nextTargetGap,
    };

    // R4: S2 alternatives labels
    reset('r4', DOCS.S2);
    const r4Alts = asked('r4', DOCS.S2, 'alternativesCompetitors');
    evidence.R4 = {
      question: r4Alts.questionText,
      labels: r4Alts.options.map((o) => o.label),
    };

    // Guard: unknown payer
    reset('g-unknown', DOCS.S1);
    const gUnknown = applyGap('g-unknown', DOCS.S1, 'payer', 'unknown');
    const unknownLoop = loadAiPmLoopState('g-unknown');
    evidence.guardUnknown = {
      ...gUnknown,
      lastIntent: unknownLoop.turns.at(-1)?.intent ?? null,
    };

    // Guard: acquaintance one-time purchase (S5)
    reset('g-friend', DOCS.S5);
    const gFriend = applyBusinessChoiceThroughLoop({
      projectId: 'g-friend',
      documentText: DOCS.S5,
      option: {
        id: 'validation-friend',
        label: '한 번만',
        answerText: '내가 지인에게 판 것이 1회 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    evidence.guardFriendSale = snapshot('g-friend', gFriend);

    // Guard: S4 contradiction
    reset('g-s4', DOCS.S4);
    applyGap('g-s4', DOCS.S4, 'customerPersona', 'specific', /아이|부모/);
    applyGap('g-s4', DOCS.S4, 'payer', 'specific', /부모/);
    const contradicted = applyBusinessChoiceThroughLoop({
      projectId: 'g-s4',
      documentText: DOCS.S4,
      option: {
        id: 's4-contradict',
        label: '기타',
        answerText: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        kind: 'specific',
        appliesToGap: 'customerPersona',
        evidenceClassHint: 'ASSUMPTION',
      },
      askedQuestionText: '이미 구독료를 낸 부모가 있나요?',
    });
    evidence.guardS4 = snapshot('g-s4', contradicted);

    // Guard: marketplace one-sided
    reset('g-s6', DOCS.S6);
    applyGap('g-s6', DOCS.S6, 'problemJtbd', 'specific', /믿|신뢰|사람/);
    const s6Supply = applyBusinessChoiceThroughLoop({
      projectId: 'g-s6',
      documentText: DOCS.S6,
      option: {
        id: 's6-supply',
        label: '아직 집만 있음',
        answerText: '아직 집만 있고 활동 가능한 도우미는 없습니다.',
        kind: 'specific',
        appliesToGap: 'executionConstraints',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    const s6Pay = applyBusinessChoiceThroughLoop({
      projectId: 'g-s6',
      documentText: DOCS.S6,
      option: {
        id: 's6-pay',
        label: '없다',
        answerText: '집이 신원 확인 때문에 수수료를 낸 적은 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    });
    evidence.guardS6 = {
      afterSupply: snapshot('g-s6', s6Supply),
      afterNoPay: snapshot('g-s6', s6Pay),
    };

    // Free text other
    reset('g-other', DOCS.S1);
    const waiting = applyBusinessChoiceThroughLoop({
      projectId: 'g-other',
      documentText: DOCS.S1,
      option: pick(asked('g-other', DOCS.S1, 'payer').options, 'other'),
      freeText: '',
    });
    const filled = applyBusinessChoiceThroughLoop({
      projectId: 'g-other',
      documentText: DOCS.S1,
      option: pick(asked('g-other', DOCS.S1, 'payer').options, 'other'),
      freeText: '본사·가맹본부가 결제합니다',
    });
    evidence.guardOther = {
      emptyWaits: waiting.waitingForFreeText,
      filled: snapshot('g-other', filled),
    };

    // S1–S6 follow-engine 8 turns
    const follow: Record<string, unknown> = {};
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const) {
      const pid = `follow-${id}`;
      reset(pid, DOCS[id]);
      follow[id] = followEngine(pid, DOCS[id], 8);
    }
    evidence.followEngine = follow;

    writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    expect(r1Customer.nextQuestionText).toBeTruthy();
    expect(r4Alts.options.length).toBeGreaterThan(2);
  });
});
