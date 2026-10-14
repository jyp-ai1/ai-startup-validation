/**
 * PR #197 conversation-quality regression.
 * Asserts that founder answers change understanding, judgment, and the next ask.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import { buildAiPmSimpleQuestionSnapshot } from '../ai-pm-simple-question-presenter';
import {
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
  type BusinessChoiceOption,
} from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { getConflictFact, getFact } from '../conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

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

function memoryNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  return buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
}

function livingNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = memoryNow(projectId, documentText);
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
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
  return applyBusinessChoiceThroughLoop({
    projectId,
    documentText,
    option,
    freeText,
    askedQuestionText: question.questionText,
  });
}

describe('PR #197 conversation quality', () => {
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

  it('S1 — customer answer does not re-ask the closed problem', () => {
    reset('cq-s1', DOCS.S1);
    const afterProblem = applyGap('cq-s1', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    expect(afterProblem.judgmentAfter.dimensions.problem.status).not.toBe('unknown');
    expect(afterProblem.nextTargetGap).not.toBe('problemJtbd');

    const afterCustomer = applyGap('cq-s1', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    expect(afterCustomer.judgmentAfter.dimensions.customer.status).not.toBe('unknown');
    expect(afterCustomer.nextTargetGap).toBe('payer');
    expect(afterCustomer.nextQuestionText ?? '').not.toMatch(/핵심 불편은/);
    expect(afterCustomer.nextQuestionText ?? '').not.toMatch(/맞나요\?/);
    expect(afterCustomer.nextWhyNow ?? '').not.toMatch(/누구를 위한 사업인지/);
    expect(loadAiPmLoopState('cq-s1').gapState?.gaps.payer?.completeness).not.toBe('CLOSED');
  });

  it('S1 — payment yes vs none changes judgment without GO or Fact', () => {
    reset('cq-pay-yes', DOCS.S1);
    const yes = applyBusinessChoiceThroughLoop({
      projectId: 'cq-pay-yes',
      documentText: DOCS.S1,
      option: {
        id: 'v-yes',
        label: '실제 결제나 사용 증거가 있습니다',
        answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    reset('cq-pay-no', DOCS.S1);
    const no = applyBusinessChoiceThroughLoop({
      projectId: 'cq-pay-no',
      documentText: DOCS.S1,
      option: {
        id: 'v-no',
        label: '아직 없다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    });

    expect(yes.judgmentAfter.dimensions.customerChange.statusReason ?? '').toMatch(/약증거/);
    expect(no.judgmentAfter.dimensions.customerChange.statusReason ?? '').toMatch(/미확정/);
    expect(yes.judgmentAfter.dimensions.customerChange.summary).not.toBe(
      no.judgmentAfter.dimensions.customerChange.summary,
    );
    expect(yes.judgmentAfter.dimensions.customerChange.status).not.toBe('clear');
    expect(no.judgmentAfter.dimensions.customerChange.status).not.toBe('clear');
    expect(yes.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
    expect(no.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
    expect(yes.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분|GO/);
    expect(no.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분|GO/);
    expect(yes.applied).toBe(false);
    expect(no.applied).toBe(false);
  });

  it('S1 — unknown payer is not promoted to Fact', () => {
    reset('cq-unknown', DOCS.S1);
    const result = applyGap('cq-unknown', DOCS.S1, 'payer', 'unknown');
    expect(loadAiPmLoopState('cq-unknown').turns.at(-1)?.intent).toBe('unknown_signal');
    expect(result.nextTargetGap).not.toBe('payer');
    expect(result.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분/);
    expect(loadAiPmLoopState('cq-unknown').gapState?.gaps.payer?.completeness).not.toBe(
      'CLOSED',
    );
  });

  it('S1 — 기타 + free text is applied on throughLoop', () => {
    reset('cq-other', DOCS.S1);
    const waiting = applyBusinessChoiceThroughLoop({
      projectId: 'cq-other',
      documentText: DOCS.S1,
      option: pick(asked('cq-other', DOCS.S1, 'payer').options, 'other'),
      freeText: '',
    });
    expect(waiting.waitingForFreeText).toBe(true);
    expect(waiting.persisted).toBe(false);

    const filled = applyBusinessChoiceThroughLoop({
      projectId: 'cq-other',
      documentText: DOCS.S1,
      option: pick(asked('cq-other', DOCS.S1, 'payer').options, 'other'),
      freeText: '본사·가맹본부가 결제합니다',
      askedQuestionText: asked('cq-other', DOCS.S1, 'payer').questionText,
    });
    expect(filled.waitingForFreeText).toBe(false);
    expect(filled.persisted).toBe(true);
    expect(filled.resolved.answerText).toMatch(/본사|가맹/);
    expect(loadAiPmLoopState('cq-other').turns.at(-1)?.answer).toMatch(/본사|가맹/);
  });

  it.each([
    ['S2', DOCS.S2, /발견|흩어|전통주/, /선물|30|40|애호|양조/],
    ['S3', DOCS.S3, /메일|오타|엑셀/, /영업|관리자|제조/],
    ['S4', DOCS.S4, /고르|선택|시간/, /아이|부모/],
    ['S5', DOCS.S5, /맛|비싸|단백질/, /20|30|헬스|운동/],
    ['S6', DOCS.S6, /믿|사람|도우미/, /맞벌이|집|가정/],
  ] as const)(
    '%s — after problem + customer, next ask is not the closed customer slot',
    (id, doc, problemRe, customerRe) => {
      const pid = `cq-follow-${id}`;
      reset(pid, doc);
      applyGap(pid, doc, 'problemJtbd', 'specific', problemRe);
      const afterCustomer = applyGap(pid, doc, 'customerPersona', 'specific', customerRe);
      expect(afterCustomer.nextTargetGap).not.toBe('customerPersona');
      expect(afterCustomer.nextTargetGap).not.toBe('problemJtbd');
      expect(afterCustomer.nextQuestionText ?? '').not.toMatch(/핵심 불편은/);
      expect(afterCustomer.nextWhyNow ?? '').not.toMatch(/누구를 위한 사업인지/);
    },
  );

  it('S2 — alternatives are problem-linked workarounds, not the problem sentence', () => {
    reset('cq-s2-alt', DOCS.S2);
    const alts = asked('cq-s2-alt', DOCS.S2, 'alternativesCompetitors');
    const labels = alts.options.filter((o) => o.kind === 'specific').map((o) => o.label);
    expect(labels.join(' ')).toMatch(/아는 술|지인|양조장/);
    expect(labels.some((label) => /지금은 양조장마다 채널이 흩어/.test(label))).toBe(false);
    expect(labels.some((label) => /주문과 배송/.test(label))).toBe(false);
  });

  it('S4 — off-slot customer contradiction reopens the previous Fact', () => {
    reset('cq-s4', DOCS.S4);
    applyGap('cq-s4', DOCS.S4, 'customerPersona', 'specific', /아이|부모/);
    expect(loadAiPmLoopState('cq-s4').gapState?.gaps.customerPersona?.completeness).toBe(
      'CLOSED',
    );
    const contradicted = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s4',
      documentText: DOCS.S4,
      option: {
        id: 's4-contradict',
        label: '기타',
        answerText: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
      askedQuestionText: '이미 구독료를 낸 부모가 있나요?',
    });
    expect(
      loadAiPmLoopState('cq-s4').gapState?.gaps.customerPersona?.completeness,
    ).toBe('CONTRADICTED');
    expect(contradicted.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분|GO/);
    const livingCustomer = contradicted.livingAfter.claims.find(
      (claim) => claim.fieldKey === 'customerPersona',
    );
    expect(livingCustomer?.status).toBe('contradiction');
    expect(livingCustomer?.value).toMatch(/충돌/);
    expect(livingCustomer?.value).toMatch(/20대/);
    expect(livingCustomer?.provenance).not.toBe('USER_CONFIRMED');
    const memory = memoryNow('cq-s4', DOCS.S4);
    expect(getFact(memory, 'customer')).toBeNull();
    expect(getConflictFact(memory, 'customer')?.value).toMatch(/20대/);
    expect(
      memory.facts.some(
        (fact) =>
          fact.key === 'customer' &&
          fact.lifecycle === 'superseded' &&
          /맞벌이|부모/.test(fact.value),
      ),
    ).toBe(true);
  });

  it('S5 — acquaintance one-time sale is weak evidence, not validated demand', () => {
    reset('cq-s5', DOCS.S5);
    const result = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s5',
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
    expect(result.judgmentAfter.dimensions.customerChange.status).toBe('needs_check');
    expect(result.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
    expect(result.judgmentAfter.dimensions.customerChange.statusReason ?? '').toMatch(
      /지인 1회|반복 수요/,
    );
    expect(result.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분|GO/);
    expect(result.applied).toBe(false);
  });

  it('S6 — supply 0 + payment 0 does not emit GO', () => {
    reset('cq-s6', DOCS.S6);
    applyBusinessChoiceThroughLoop({
      projectId: 'cq-s6',
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
    const noPay = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s6',
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
    expect(noPay.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분|GO|네트워크 효과/);
    expect(noPay.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
  });

  it('S2–S6 — after customer, next ask is payer not the document one-liner', () => {
    for (const [id, doc, problemRe, customerRe] of [
      ['S2', DOCS.S2, /발견|흩어|전통주/, /선물|30|40|애호|양조/],
      ['S3', DOCS.S3, /메일|오타|엑셀/, /영업|관리자|제조/],
      ['S5', DOCS.S5, /맛|비싸|단백질/, /20|30|헬스|운동/],
    ] as const) {
      const pid = `cq-payer-not-oneliner-${id}`;
      reset(pid, doc);
      applyGap(pid, doc, 'problemJtbd', 'specific', problemRe);
      const afterCustomer = applyGap(pid, doc, 'customerPersona', 'specific', customerRe);
      expect(afterCustomer.nextTargetGap, id).toBe('payer');
      expect(afterCustomer.nextQuestionText ?? '', id).not.toMatch(/누구에게 무엇을 제공/);
    }
  });

  it('S3 — problem options keep the full typo clause, not 「메일」', () => {
    reset('cq-s3-label', DOCS.S3);
    const labels = asked('cq-s3-label', DOCS.S3, 'problemJtbd')
      .options.filter((o) => o.kind === 'specific')
      .map((o) => o.label);
    expect(labels.some((label) => label === '메일')).toBe(false);
    expect(labels.join(' ')).toMatch(/오타|엑셀|옮기/);
  });

  it('S2 — customer options keep the gift/hobby clause, not 「전통주를 선물」', () => {
    reset('cq-s2-label', DOCS.S2);
    const labels = asked('cq-s2-label', DOCS.S2, 'customerPersona')
      .options.filter((o) => o.kind === 'specific')
      .map((o) => o.label);
    expect(labels.some((label) => label === '전통주를 선물')).toBe(false);
    expect(labels.join(' ')).toMatch(/30|40|선물|애호/);
  });

  it('S1 — payer options are roles, not the customer copied as buyer', () => {
    reset('cq-s1-payer', DOCS.S1);
    const labels = asked('cq-s1-payer', DOCS.S1, 'payer')
      .options.filter((o) => o.kind === 'specific')
      .map((o) => o.label);
    expect(labels.join(' ')).toMatch(/사장님|본사|관리자|대표/);
    expect(labels.some((label) => /반찬가게가 비용을 지불/.test(label))).toBe(false);
  });

  it('S4 — after off-slot contradiction, next ask reconfirms the customer', () => {
    reset('cq-s4-next', DOCS.S4);
    applyGap('cq-s4-next', DOCS.S4, 'customerPersona', 'specific', /아이|부모/);
    const contradicted = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s4-next',
      documentText: DOCS.S4,
      option: {
        id: 's4-contradict',
        label: '기타',
        answerText: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
      askedQuestionText: '이미 구독료를 낸 부모가 있나요?',
    });
    expect(contradicted.nextTargetGap).toBe('customerPersona');
    expect(contradicted.nextQuestionText ?? '').toMatch(/맞는 고객|누구/);
    expect(contradicted.judgmentAfter.dimensions.customer.summary).not.toBe('맞벌이 부모');
    expect(contradicted.judgmentAfter.dimensions.customer.knowledgeSource).not.toBe(
      'ceo_confirmed',
    );
    expect(contradicted.judgmentAfter.dimensions.customer.summary).toMatch(/충돌|20대/);
    expect(contradicted.judgmentAfter.dimensions.customer.status).toBe('needs_check');
    expect(
      contradicted.livingAfter.claims.find((claim) => claim.fieldKey === 'customerPersona')
        ?.status,
    ).toBe('contradiction');
  });

  it('S4 T7 — reconfirm promotes 20s and supersedes dual-income parents', () => {
    reset('cq-s4-t7', DOCS.S4);
    applyGap('cq-s4-t7', DOCS.S4, 'customerPersona', 'specific', /아이|부모/);
    applyBusinessChoiceThroughLoop({
      projectId: 'cq-s4-t7',
      documentText: DOCS.S4,
      option: {
        id: 's4-contradict',
        label: '기타',
        answerText: '사실 아이가 아니라 혼자 사는 20대가 메인이에요',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
      askedQuestionText: '이미 구독료를 낸 부모가 있나요?',
    });
    const confirmed = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s4-t7',
      documentText: DOCS.S4,
      option: {
        id: 's4-reconfirm',
        label: '혼자 사는 20대',
        answerText: '지금 메인 고객은 혼자 사는 20대예요',
        kind: 'specific',
        appliesToGap: 'customerPersona',
        evidenceClassHint: 'FACT',
      },
      askedQuestionText: '이 서비스를 가장 필요로 하는 사람은 누구인가요?',
    });
    expect(
      loadAiPmLoopState('cq-s4-t7').gapState?.gaps.customerPersona?.completeness,
    ).toBe('CLOSED');
    const livingCustomer = confirmed.livingAfter.claims.find(
      (claim) => claim.fieldKey === 'customerPersona',
    );
    expect(livingCustomer?.status).toBe('confirmed');
    expect(livingCustomer?.value).toMatch(/20대/);
    expect(livingCustomer?.value).not.toMatch(/맞벌이 부모/);
    expect(confirmed.judgmentAfter.dimensions.customer.summary).toMatch(/20대/);
    expect(confirmed.judgmentAfter.dimensions.customer.summary).not.toBe('맞벌이 부모');
    expect(confirmed.nextTargetGap).not.toBe('customerPersona');
    const memory = memoryNow('cq-s4-t7', DOCS.S4);
    expect(getFact(memory, 'customer')?.value).toMatch(/20대/);
    expect(getFact(memory, 'customer')?.value).not.toMatch(/맞벌이 부모/);
    expect(getConflictFact(memory, 'customer')).toBeNull();
    expect(
      memory.facts.some(
        (fact) =>
          fact.key === 'customer' &&
          fact.lifecycle === 'superseded' &&
          /맞벌이|부모/.test(fact.value),
      ),
    ).toBe(true);
  });

  it('S6 — role payer 「집이 낸다」 closes payer and continues past it', () => {
    reset('cq-s6-payer', DOCS.S6);
    applyGap('cq-s6-payer', DOCS.S6, 'problemJtbd', 'specific', /믿|사람|도우미/);
    applyGap('cq-s6-payer', DOCS.S6, 'customerPersona', 'specific', /맞벌이|집|가정/);
    const afterPayer = applyGap('cq-s6-payer', DOCS.S6, 'payer', 'specific', /집이 낸다|집/);
    expect(loadAiPmLoopState('cq-s6-payer').gapState?.gaps.payer?.completeness).toBe('CLOSED');
    expect(afterPayer.nextTargetGap).not.toBe('payer');
    expect(afterPayer.nextTargetGap).toBe('businessOneLiner');
    expect(afterPayer.nextQuestionText ?? '').not.toMatch(/누구에게 무엇을 제공/);
    expect(afterPayer.nextQuestionText ?? '').not.toMatch(/제가 이해한 사업은/);
  });

  it('S2–S5 — after payer closes, next ask is not the document one-liner', () => {
    for (const [id, doc, problemRe, customerRe] of [
      ['S2', DOCS.S2, /발견|흩어|전통주/, /선물|30|40|애호|양조/],
      ['S3', DOCS.S3, /메일|오타|엑셀/, /영업|관리자|제조/],
      ['S5', DOCS.S5, /맛|비싸|단백질/, /20|30|헬스|운동/],
    ] as const) {
      const pid = `cq-after-payer-${id}`;
      reset(pid, doc);
      applyGap(pid, doc, 'problemJtbd', 'specific', problemRe);
      applyGap(pid, doc, 'customerPersona', 'specific', customerRe);
      const afterPayer = applyGap(pid, doc, 'payer', 'specific');
      expect(afterPayer.nextTargetGap, id).toBe('businessOneLiner');
      expect(afterPayer.nextQuestionText ?? '', id).not.toMatch(/누구에게 무엇을 제공/);
      expect(afterPayer.nextQuestionText ?? '', id).not.toMatch(/제가 이해한 사업은/);
    }
  });

  it('S1 — after payment-none, does not reconfirm the closed problem', () => {
    reset('cq-s1-nopay-next', DOCS.S1);
    applyGap('cq-s1-nopay-next', DOCS.S1, 'problemJtbd', 'specific', /주문|배송/);
    applyGap('cq-s1-nopay-next', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    applyGap('cq-s1-nopay-next', DOCS.S1, 'payer', 'unknown');
    applyGap('cq-s1-nopay-next', DOCS.S1, 'revenueModel', 'specific', /구독/);
    applyGap('cq-s1-nopay-next', DOCS.S1, 'alternativesCompetitors', 'specific');
    const noPay = applyBusinessChoiceThroughLoop({
      projectId: 'cq-s1-nopay-next',
      documentText: DOCS.S1,
      option: {
        id: 'v-no',
        label: '아직 없다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    });
    expect(noPay.nextTargetGap).not.toBe('problemJtbd');
    expect(noPay.nextQuestionText ?? '').not.toMatch(/핵심 불편은|맞나요\?/);
  });

  it('engine-follow continues past Stage A into a later gap', () => {
    reset('cq-follow-s1', DOCS.S1);
    let gap = 'problemJtbd';
    const askedGaps: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const q = asked('cq-follow-s1', DOCS.S1, gap);
      const specific = q.options.find((o) => o.kind === 'specific') ?? q.options[0]!;
      const result = applyBusinessChoiceThroughLoop({
        projectId: 'cq-follow-s1',
        documentText: DOCS.S1,
        option: specific,
        askedQuestionText: q.questionText,
      });
      askedGaps.push(gap);
      if (!result.nextTargetGap || result.nextTargetGap === gap) break;
      gap = result.nextTargetGap;
    }
    expect(askedGaps.length).toBeGreaterThanOrEqual(4);
    expect(askedGaps).toContain('payer');
    expect(
      askedGaps.some((item) =>
        ['alternativesCompetitors', 'validationTestability', 'marketChannel'].includes(item),
      ),
    ).toBe(true);
    expect(askedGaps.at(-1)).not.toBe('customerPersona');
    expect(askedGaps.at(-1)).not.toBe('problemJtbd');
  });

  it('presenter does not keep the canned customer why after customer is confirmed', () => {
    reset('cq-why', DOCS.S1);
    applyGap('cq-why', DOCS.S1, 'customerPersona', 'specific', /반찬/);
    const living = livingNow('cq-why', DOCS.S1);
    const snap = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: '반찬가게에서 비용을 내는 사람은 누구인가요?',
      targetGap: 'payer',
      whyNow: '구매자·도입 결정자를 확인하려고 합니다.',
      questionCount: 2,
      living,
      documentText: DOCS.S1,
    });
    expect(snap.whyQuestionSummary).not.toMatch(/누구를 위한 사업인지/);
  });
});
