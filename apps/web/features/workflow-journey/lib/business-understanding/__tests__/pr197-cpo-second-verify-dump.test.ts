/**
 * PR #197 CPO 2nd-verify dump — records executed apply-path I/O.
 * This file does not promote planned expectations to PASS.
 * Verdicts here are CTO 1st-verify only.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

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

const OUT =
  '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-SECOND-VERIFY-DUMP.json';

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

const BUSINESS = {
  S1: { id: 'S1', type: 'B2B SaaS', name: '소상공인 배송 SaaS' },
  S2: { id: 'S2', type: '브랜드+유통', name: '전통주 브랜드' },
  S3: { id: 'S3', type: 'B2B SaaS', name: '견적 자동화' },
  S4: { id: 'S4', type: 'B2C 구독', name: '아이 간식 구독 박스' },
  S5: { id: 'S5', type: 'D2C 커머스', name: '단백질 쿠키' },
  S6: { id: 'S6', type: '양면 중개', name: '가사 도우미 중개' },
} as const;

type Verdict = 'PASS' | 'FAIL' | 'NOT VERIFIED';

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
  return { loop, living: buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
  }), memory };
}

function asked(projectId: string, documentText: string, targetGap: string) {
  return buildBusinessChoiceQuestion({
    living: livingNow(projectId, documentText).living,
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

function dimSnap(result: ReturnType<typeof applyBusinessChoiceThroughLoop>) {
  const d = result.judgmentAfter.dimensions;
  return {
    customer: {
      status: d.customer.status,
      summary: d.customer.summary,
      reason: d.customer.statusReason ?? null,
      evidenceType: d.customer.evidenceType ?? null,
      knowledgeSource: d.customer.knowledgeSource ?? null,
    },
    problem: {
      status: d.problem.status,
      summary: d.problem.summary,
      reason: d.problem.statusReason ?? null,
    },
    solution: {
      status: d.solution.status,
      summary: d.solution.summary,
      reason: d.solution.statusReason ?? null,
    },
    customerChange: {
      status: d.customerChange.status,
      summary: d.customerChange.summary,
      reason: d.customerChange.statusReason ?? null,
      evidenceType: d.customerChange.evidenceType ?? null,
    },
    conclusion: result.judgmentAfter.conclusion,
    nextCheck: result.judgmentAfter.nextCheck,
  };
}

function dimBefore(result: ReturnType<typeof applyBusinessChoiceThroughLoop>) {
  const before = result.judgmentBefore;
  if (!before) return null;
  return {
    customer: before.dimensions.customer.status,
    problem: before.dimensions.problem.status,
    solution: before.dimensions.solution.status,
    customerChange: before.dimensions.customerChange.status,
    conclusion: before.conclusion,
  };
}

function gapSnap(projectId: string) {
  const gaps = loadAiPmLoopState(projectId).gapState?.gaps ?? {};
  const keys = [
    'businessOneLiner',
    'customerPersona',
    'payer',
    'problemJtbd',
    'revenueModel',
    'alternativesCompetitors',
    'validationTestability',
    'executionConstraints',
  ];
  const out: Record<string, string> = {};
  for (const key of keys) {
    if (gaps[key]) out[key] = gaps[key].completeness;
  }
  return out;
}

function knowledgeSnap(projectId: string, documentText: string) {
  const { loop, living, memory } = livingNow(projectId, documentText);
  const lastReview = loop.turns.at(-1)?.review;
  return {
    livingClaims: living.claims
      .filter((c) => c.value)
      .map((c) => ({
        field: c.fieldKey,
        value: c.value,
        status: c.status,
        provenance: c.provenance,
      })),
    memoryFacts: memory.facts.map((f) => ({
      key: f.key,
      value: f.value,
      lifecycle: f.lifecycle,
      source: f.source,
    })),
    extractedFacts: (lastReview?.extractedFacts ?? []).map((f) => ({
      key: f.key,
      value: f.value,
      evidenceClass: f.evidenceClass,
      confidence: f.confidence,
      targetGap: f.targetGap,
    })),
    reviewUnknown: lastReview?.unknown ?? [],
    reviewUnconfirmed: lastReview?.unconfirmed ?? [],
    contradictions: lastReview?.contradictions ?? [],
  };
}

function captureTurn(
  projectId: string,
  documentText: string,
  result: ReturnType<typeof applyBusinessChoiceThroughLoop>,
  askedMeta: {
    gap: string;
    question: string;
    labels: string[];
    picked: string;
    freeText?: string;
  },
) {
  const loop = loadAiPmLoopState(projectId);
  const last = loop.turns.at(-1);
  return {
    askedGap: askedMeta.gap,
    askedQuestion: askedMeta.question,
    optionLabels: askedMeta.labels,
    pickedLabel: askedMeta.picked,
    freeText: askedMeta.freeText ?? null,
    actualUserInput: last?.answer ?? result.resolved.answerText,
    intent: last?.intent ?? null,
    applied: result.applied,
    persisted: result.persisted,
    waitingForFreeText: result.waitingForFreeText,
    judgmentBefore: dimBefore(result),
    judgmentAfter: dimSnap(result),
    gapStateAfter: gapSnap(projectId),
    knowledge: knowledgeSnap(projectId, documentText),
    nextTargetGap: result.nextTargetGap,
    nextQuestionText: result.nextQuestionText,
    nextWhyNow: result.nextWhyNow,
    conversationContinues: result.conversationContinues,
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
  return captureTurn(projectId, documentText, result, {
    gap: targetGap,
    question: question.questionText,
    labels: question.options.map((o) => o.label),
    picked: option.label,
    freeText,
  });
}

function applyCustom(
  projectId: string,
  documentText: string,
  option: BusinessChoiceOption,
  askedQuestionText?: string,
  freeText?: string,
) {
  const result = applyBusinessChoiceThroughLoop({
    projectId,
    documentText,
    option,
    freeText,
    askedQuestionText,
  });
  return captureTurn(projectId, documentText, result, {
    gap: option.appliesToGap,
    question: askedQuestionText ?? option.appliesToGap,
    labels: [option.label],
    picked: option.label,
    freeText,
  });
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
    turns.push(
      captureTurn(projectId, documentText, result, {
        gap,
        question: q.questionText,
        labels: q.options.map((o) => o.label),
        picked: (specific ?? q.options[0]!).label,
      }),
    );
    if (!result.nextTargetGap || result.nextTargetGap === gap) break;
    gap = result.nextTargetGap;
  }
  return turns;
}

function verdict(ok: boolean, reason: string): { status: Verdict; reason: string } {
  return { status: ok ? 'PASS' : 'FAIL', reason };
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

describe('PR #197 CPO second-verify dump', () => {
  const evidence: Record<string, unknown> = {
    meta: {
      implSha: gitSha(),
      executedAt: new Date().toISOString(),
      applyPath: 'applyBusinessChoiceThroughLoop',
      loginUi: 'NOT VERIFIED',
      note:
        'Planned expected output, test-code written, and tests executed are distinct. This JSON is executed I/O only.',
    },
  };

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

  it('records executed I/O for the CPO package', () => {
    // A/B: scripted frozen-path turns + engine-follow for six businesses
    const scripted: Record<string, unknown> = {};

    // S1 frozen path T1 problem, T2 customer, T3 unknown payer, T4 revenue, T5 alts, T7 no-pay
    reset('pkg-s1', DOCS.S1);
    const s1t1 = applyGap('pkg-s1', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    const s1t2 = applyGap('pkg-s1', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    const s1t3 = applyGap('pkg-s1', DOCS.S1, 'payer', 'unknown');
    const s1t4 = applyGap('pkg-s1', DOCS.S1, 'revenueModel', 'specific', /구독/);
    const s1t5 = applyGap('pkg-s1', DOCS.S1, 'alternativesCompetitors', 'specific');
    const s1t7 = applyCustom(
      'pkg-s1',
      DOCS.S1,
      {
        id: 's1-nopay',
        label: '아직 없다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
      '그 변화를 보여 줄 결제·사용 증거가 있나요?',
    );
    scripted.S1 = {
      business: BUSINESS.S1,
      turns: [s1t1, s1t2, s1t3, s1t4, s1t5, s1t7],
      verdicts: [
        verdict(
          s1t2.nextTargetGap === 'payer' &&
            !/핵심 불편은|맞나요\?/.test(s1t2.nextQuestionText ?? ''),
          'S1 after customer → payer, no problem confirm',
        ),
        verdict(
          s1t2.judgmentAfter.customer.status !== 'unknown' &&
            s1t2.gapStateAfter.payer !== 'CLOSED',
          'customer closed is not treated as payer/payment Fact',
        ),
        verdict(
          s1t3.intent === 'unknown_signal' && s1t3.gapStateAfter.payer !== 'CLOSED',
          'unknown payer is not Fact-promoted',
        ),
        verdict(
          !/검증 완료|사업성이 충분|GO/.test(s1t7.judgmentAfter.conclusion) &&
            s1t7.judgmentAfter.customerChange.evidenceType !== 'fact',
          'no-payment path stays HOLD / not Fact',
        ),
      ],
    };

    reset('pkg-s2', DOCS.S2);
    const s2t1 = applyGap('pkg-s2', DOCS.S2, 'problemJtbd', 'specific', /발견|흩어|전통주/);
    const s2t2 = applyGap('pkg-s2', DOCS.S2, 'customerPersona', 'specific', /선물|30|40|애호/);
    const s2t3 = applyGap('pkg-s2', DOCS.S2, 'payer', 'specific');
    const s2alts = asked('pkg-s2', DOCS.S2, 'alternativesCompetitors');
    const s2t5 = applyGap(
      'pkg-s2',
      DOCS.S2,
      'alternativesCompetitors',
      'specific',
      /지인|아는 술|양조장/,
    );
    scripted.S2 = {
      business: BUSINESS.S2,
      turns: [s2t1, s2t2, s2t3, s2t5],
      alternatives: s2alts.options.map((o) => o.label),
      verdicts: [
        verdict(
          s2t2.nextTargetGap !== 'customerPersona' && s2t2.nextTargetGap !== 'problemJtbd',
          'S2 after customer does not re-ask closed slots',
        ),
        verdict(
          s2alts.options.some((o) => /아는 술|지인|양조장/.test(o.label)) &&
            !s2alts.options.some((o) => /지금은 양조장마다 채널이 흩어/.test(o.label)),
          'S2 alternatives are problem-linked, not problem-sentence reuse',
        ),
        verdict(s2t2.judgmentAfter.customer.status !== 'unknown', 'S2 customer judgment updates'),
      ],
    };

    reset('pkg-s3', DOCS.S3);
    const s3t1 = applyGap('pkg-s3', DOCS.S3, 'problemJtbd', 'specific', /메일|오타|엑셀/);
    const s3t2 = applyGap('pkg-s3', DOCS.S3, 'customerPersona', 'specific', /영업|관리자|제조/);
    const s3t3 = applyGap('pkg-s3', DOCS.S3, 'payer', 'specific');
    const s3t4 = applyGap('pkg-s3', DOCS.S3, 'problemFrequencySeverity', 'unknown');
    scripted.S3 = {
      business: BUSINESS.S3,
      turns: [s3t1, s3t2, s3t3, s3t4],
      verdicts: [
        verdict(
          s3t2.nextTargetGap !== 'customerPersona' && s3t2.nextTargetGap !== 'problemJtbd',
          'S3 after user confirm advances past closed customer/problem',
        ),
        verdict(
          s3t4.intent === 'unknown_signal' &&
            !/검증 완료|사업성이 충분|GO/.test(s3t4.judgmentAfter.conclusion),
          'S3 unknown frequency is not promoted to scale Fact / GO',
        ),
      ],
    };

    reset('pkg-s4', DOCS.S4);
    const s4t1 = applyGap('pkg-s4', DOCS.S4, 'problemJtbd', 'specific', /고르|선택|시간/);
    const s4t2 = applyGap('pkg-s4', DOCS.S4, 'customerPersona', 'specific', /아이|부모/);
    const s4t3 = applyGap('pkg-s4', DOCS.S4, 'payer', 'specific', /부모/);
    const s4t6 = applyCustom(
      'pkg-s4',
      DOCS.S4,
      {
        id: 's4-contradict',
        label: '기타',
        answerText: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
      '이미 구독료를 낸 부모가 있나요?',
    );
    scripted.S4 = {
      business: BUSINESS.S4,
      turns: [s4t1, s4t2, s4t3, s4t6],
      verdicts: [
        verdict(
          s4t6.gapStateAfter.customerPersona === 'CONTRADICTED',
          'S4 off-slot customer reversal marks CONTRADICTED',
        ),
        verdict(
          s4t6.judgmentAfter.customer.summary !== '맞벌이 부모' &&
            s4t6.judgmentAfter.customer.knowledgeSource !== 'ceo_confirmed' &&
            /충돌|20대/.test(s4t6.judgmentAfter.customer.summary),
          'S4 CONTRADICTED customer updates judgment summary',
        ),
        verdict(
          !/검증 완료|사업성이 충분|GO/.test(s4t6.judgmentAfter.conclusion),
          'S4 contradiction does not emit GO',
        ),
      ],
    };

    reset('pkg-s5', DOCS.S5);
    const s5t1 = applyGap('pkg-s5', DOCS.S5, 'problemJtbd', 'specific', /맛|비싸|단백질/);
    const s5t2 = applyGap('pkg-s5', DOCS.S5, 'customerPersona', 'specific', /20|30|헬스|운동/);
    const s5t5 = applyCustom(
      'pkg-s5',
      DOCS.S5,
      {
        id: 's5-other-payer',
        label: '기타',
        answerText: '헬스 트레이너가 회원에게 추천하고 회원이 결제합니다',
        kind: 'other',
        appliesToGap: 'payer',
        evidenceClassHint: 'ASSUMPTION',
      },
      asked('pkg-s5', DOCS.S5, 'payer').questionText,
      '헬스 트레이너가 회원에게 추천하고 회원이 결제합니다',
    );
    const s5friend = applyCustom(
      'pkg-s5',
      DOCS.S5,
      {
        id: 'validation-friend',
        label: '한 번만',
        answerText: '내가 지인에게 판 것이 1회 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    );
    scripted.S5 = {
      business: BUSINESS.S5,
      turns: [s5t1, s5t2, s5t5, s5friend],
      verdicts: [
        verdict(s5t2.judgmentAfter.customer.status !== 'unknown', 'S5 customer judgment updates'),
        verdict(s5t5.persisted && /트레이너|회원/.test(s5t5.actualUserInput), 'S5 free text persists'),
        verdict(
          s5friend.judgmentAfter.customerChange.status === 'needs_check' &&
            s5friend.judgmentAfter.customerChange.evidenceType !== 'fact' &&
            /지인 1회|반복 수요/.test(s5friend.judgmentAfter.customerChange.reason ?? ''),
          'S5 friend-1x is weak evidence, not Validated',
        ),
      ],
    };

    reset('pkg-s6', DOCS.S6);
    const s6t1 = applyGap('pkg-s6', DOCS.S6, 'problemJtbd', 'specific', /믿|사람|도우미/);
    const s6t2 = applyGap('pkg-s6', DOCS.S6, 'customerPersona', 'specific', /맞벌이|집|가정/);
    const s6supply = applyCustom(
      'pkg-s6',
      DOCS.S6,
      {
        id: 's6-supply',
        label: '아직 집만 있음',
        answerText: '아직 집만 있고 활동 가능한 도우미는 없습니다.',
        kind: 'specific',
        appliesToGap: 'executionConstraints',
        evidenceClassHint: 'ASSUMPTION',
      },
    );
    const s6pay = applyCustom(
      'pkg-s6',
      DOCS.S6,
      {
        id: 's6-pay',
        label: '없다',
        answerText: '집이 신원 확인 때문에 수수료를 낸 적은 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    );
    scripted.S6 = {
      business: BUSINESS.S6,
      turns: [s6t1, s6t2, s6supply, s6pay],
      verdicts: [
        verdict(
          s6t2.nextTargetGap !== 'customerPersona' && s6t2.nextTargetGap !== 'problemJtbd',
          'S6 after customer advances',
        ),
        verdict(
          !/검증 완료|사업성이 충분|GO|네트워크 효과/.test(s6pay.judgmentAfter.conclusion) &&
            s6pay.judgmentAfter.customerChange.evidenceType !== 'fact',
          'S6 supply 0 + pay 0 does not GO',
        ),
      ],
    };
    evidence.scriptedSixBusinesses = scripted;

    const follow: Record<string, unknown> = {};
    for (const id of ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const) {
      const pid = `follow-${id}`;
      reset(pid, DOCS[id]);
      const turns = followEngine(pid, DOCS[id], 8);
      const askedGaps = turns.map((t) => t.askedGap);
      const nextGaps = turns.map((t) => t.nextTargetGap);
      const reaskedClosed =
        askedGaps.filter((g, i) => i > 0 && askedGaps.slice(0, i).includes(g)).length > 0;
      follow[id] = {
        business: BUSINESS[id],
        turnCount: turns.length,
        askedGaps,
        nextGaps,
        lastConclusion: turns.at(-1)?.judgmentAfter.conclusion ?? null,
        reaskedSameGap: reaskedClosed,
        conversationContinues: turns.every((t) => t.conversationContinues),
        turns,
        verdicts: [
          verdict(turns.length >= 3, `${id} engine-follow continues at least 3 turns`),
          verdict(
            askedGaps.includes('payer') &&
              askedGaps.some((g) =>
                [
                  'alternativesCompetitors',
                  'validationTestability',
                  'marketChannel',
                  'differentiationVsAlternatives',
                ].includes(g),
              ),
            `${id} engine-follow reaches payer and a later Stage B gap`,
          ),
          verdict(!/검증 완료|사업성이 충분|\bGO\b/.test(turns.at(-1)?.judgmentAfter.conclusion ?? ''), `${id} 8-turn follow does not declare GO`),
        ],
      };
    }
    evidence.engineFollowEightTurns = follow;

    // C: R1–R4 current vs expected (after-fix execution)
    reset('r1', DOCS.S1);
    const r1Problem = applyGap('r1', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    const r1Customer = applyGap('r1', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    evidence.R1 = {
      testId: 'R1',
      businessType: BUSINESS.S1.type,
      priorFacts: 'problem confirmed (주문·배송 분리)',
      input: r1Customer.actualUserInput,
      actualNext: r1Customer.nextQuestionText,
      actualNextGap: r1Customer.nextTargetGap,
      expected: 'payer / 도입 결정자. 문제 「맞나요?」 금지',
      beforeAfter: {
        before: r1Problem.judgmentAfter,
        after: r1Customer.judgmentAfter,
        gapsAfter: r1Customer.gapStateAfter,
      },
      nextWhy: r1Customer.nextWhyNow,
      verdict: verdict(
        r1Customer.nextTargetGap === 'payer' &&
          !/핵심 불편은|맞나요\?/.test(r1Customer.nextQuestionText ?? ''),
        'R1 next is payer, not closed-problem confirm',
      ),
    };

    reset('r2-yes', DOCS.S1);
    const r2Yes = applyCustom(
      'r2-yes',
      DOCS.S1,
      {
        id: 'v-yes',
        label: '실제 결제나 사용 증거가 있습니다',
        answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    );
    reset('r2-no', DOCS.S1);
    const r2No = applyCustom(
      'r2-no',
      DOCS.S1,
      {
        id: 'v-no',
        label: '아직 없다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    );
    evidence.R2 = {
      testId: 'R2',
      yes: r2Yes,
      no: r2No,
      expected: '있음=약증거, 없음=미확정. 둘 다 Fact/GO 아님. 판단은 달라야 함',
      verdict: verdict(
        (r2Yes.judgmentAfter.customerChange.reason ?? '') !==
          (r2No.judgmentAfter.customerChange.reason ?? '') &&
          r2Yes.judgmentAfter.customerChange.status !== 'clear' &&
          r2No.judgmentAfter.customerChange.status !== 'clear' &&
          r2Yes.judgmentAfter.customerChange.evidenceType !== 'fact' &&
          r2No.judgmentAfter.customerChange.evidenceType !== 'fact' &&
          !/검증 완료|사업성이 충분|GO/.test(r2Yes.judgmentAfter.conclusion) &&
          !/검증 완료|사업성이 충분|GO/.test(r2No.judgmentAfter.conclusion),
        'R2 payment yes/no changes judgment without Fact/GO',
      ),
    };

    evidence.R3 = {
      testId: 'R3',
      afterCustomerWhy: r1Customer.nextWhyNow,
      afterCustomerQuestion: r1Customer.nextQuestionText,
      expected: '고정 「누구를 위한 사업인지」 금지. 사업×미해결 가설',
      verdict: verdict(
        !/누구를 위한 사업인지/.test(r1Customer.nextWhyNow ?? '') &&
          !/누구를 위한 사업인지/.test(r1Customer.nextQuestionText ?? ''),
        'R3 canned customer-why is gone after customer is known',
      ),
    };

    reset('r4', DOCS.S2);
    const r4Alts = asked('r4', DOCS.S2, 'alternativesCompetitors');
    evidence.R4 = {
      testId: 'R4',
      question: r4Alts.questionText,
      labels: r4Alts.options.map((o) => o.label),
      expected: '발견 우회: 아는 술 / 지인 / 아는 양조장. 문제 문장 재사용 금지',
      verdict: verdict(
        r4Alts.options.some((o) => /아는 술|지인|양조장/.test(o.label)) &&
          !r4Alts.options.some((o) => /지금은 양조장마다 채널이 흩어/.test(o.label)),
        'R4 alternatives are discovery workarounds',
      ),
    };

    // E: unknown / free-text / contradiction
    reset('e-unknown', DOCS.S1);
    const eUnknown = applyGap('e-unknown', DOCS.S1, 'payer', 'unknown');
    reset('e-other', DOCS.S1);
    const waiting = applyBusinessChoiceThroughLoop({
      projectId: 'e-other',
      documentText: DOCS.S1,
      option: pick(asked('e-other', DOCS.S1, 'payer').options, 'other'),
      freeText: '',
    });
    const filled = applyCustom(
      'e-other',
      DOCS.S1,
      pick(asked('e-other', DOCS.S1, 'payer').options, 'other'),
      asked('e-other', DOCS.S1, 'payer').questionText,
      '본사·가맹본부가 결제합니다',
    );
    evidence.unknownFreeTextContradiction = {
      unknownPayer: {
        ...eUnknown,
        verdict: verdict(
          eUnknown.intent === 'unknown_signal' && eUnknown.gapStateAfter.payer !== 'CLOSED',
          'unknown stays unconfirmed',
        ),
      },
      otherEmptyWaits: {
        waitingForFreeText: waiting.waitingForFreeText,
        persisted: waiting.persisted,
        verdict: verdict(waiting.waitingForFreeText && !waiting.persisted, 'empty 기타 waits'),
      },
      otherFilled: {
        ...filled,
        verdict: verdict(
          filled.persisted && /본사|가맹/.test(filled.actualUserInput),
          '기타+text is stored on throughLoop',
        ),
      },
      s4Contradiction: {
        after: s4t6,
        verdict: verdict(
          s4t6.gapStateAfter.customerPersona === 'CONTRADICTED',
          'off-slot customer correction CONTRADICTED',
        ),
      },
    };

    // F: Fact / Claim / Inference / Assumption / Validated
    evidence.knowledgeClasses = {
      s1AfterCustomer: s1t2.knowledge,
      s1UnknownPayer: s1t3.knowledge,
      s1NoPay: s1t7.knowledge,
      s5Friend: s5friend.knowledge,
      s4Contradiction: s4t6.knowledge,
      notes: [
        'Memory Fact = conversation-memory current facts only (mergeable answers).',
        'Review evidenceClass comes from buildAnswerReview (FACT/INFERENCE/ASSUMPTION/UNKNOWN/CONTRADICTION).',
        'Validated is not a Memory class; customerChange.evidenceType=fact would be over-promotion.',
        'Payment and friend-1x must stay hypothesis, not Memory Fact / Validated.',
      ],
      verdicts: [
        verdict(
          !s1t3.knowledge.memoryFacts.some((f) => f.key === 'buyer' && f.lifecycle === 'current'),
          'unknown payer is not Memory Fact',
        ),
        verdict(
          s5friend.judgmentAfter.customerChange.evidenceType !== 'fact' &&
            !s5friend.applied,
          'friend-1x is not Validated / not mergeable Fact',
        ),
        verdict(
          r2Yes.applied === false && r2No.applied === false,
          'payment answers are not merged as Memory Facts',
        ),
      ],
    };

    // G: premature GO / over-promotion
    evidence.prematureGoGuards = {
      paymentYes: {
        conclusion: r2Yes.judgmentAfter.conclusion,
        change: r2Yes.judgmentAfter.customerChange,
        applied: r2Yes.applied,
      },
      friend1x: {
        conclusion: s5friend.judgmentAfter.conclusion,
        change: s5friend.judgmentAfter.customerChange,
        applied: s5friend.applied,
      },
      marketplace: {
        conclusion: s6pay.judgmentAfter.conclusion,
        change: s6pay.judgmentAfter.customerChange,
      },
      contradiction: {
        conclusion: s4t6.judgmentAfter.conclusion,
        customerGap: s4t6.gapStateAfter.customerPersona,
      },
      verdict: verdict(
        [r2Yes, s5friend, s6pay, s4t6].every(
          (row) => !/검증 완료|사업성이 충분|\bGO\b|네트워크 효과/.test(row.judgmentAfter.conclusion),
        ),
        'no premature GO on weak/no evidence paths',
      ),
    };

    evidence.loginUi = {
      status: 'NOT VERIFIED',
      reason: '로그인 UI 8턴 E2E was not executed. Engine dump is not a UI PASS.',
    };

    evidence.reproduce = {
      command:
        'pnpm --filter web exec vitest run features/workflow-journey/lib/business-understanding/__tests__/pr197-cpo-second-verify-dump.test.ts',
      flags: 'setV3ReviewPipelineForTest(true) + setAiPmJudgmentAggregationV1ForTest(true)',
      applyPath: 'applyBusinessChoiceThroughLoop',
      output: OUT,
    };

    mkdirSync('/workspace/docs/evidence/ALABOM/AI-PM', { recursive: true });
    writeFileSync(OUT, JSON.stringify(evidence, null, 2));
    expect(r1Customer.nextTargetGap).toBeTruthy();
    expect(r4Alts.options.length).toBeGreaterThan(2);
  });
});
