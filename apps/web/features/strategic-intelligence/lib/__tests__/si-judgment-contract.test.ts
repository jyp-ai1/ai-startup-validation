import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DecisionBranch, DecisionCandidate, FounderAnswerAct } from '@repo/types/domain/strategic-intelligence';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ABSENCE_SENTENCE,
  CUSTOMER_CONFIRM,
  CUSTOMER_STATEMENT,
  PAYER_CONFIRM,
  PROBLEM_STATEMENT,
  WEAK_PAYMENT_SENTENCE,
  HYPOTHESIS_ROLE_RULES,
  applyBudgetHold,
  applyFounderAnswer,
  bindLiteralFact,
  closeReview,
  createProjectLedger,
  createSeedLedger,
  defineCriterion,
  evaluateHypothesis,
  evaluateStage,
  judgeAttribution,
  judgeRequiredHypothesis,
  offerModelDraft,
  resolveConflict,
  questionHash,
  recordConflict,
  recordCriticalUnknown,
  selectNextAction,
  type JudgmentLedger,
} from '../si-judgment-contract';

const FORBIDDEN_FROZEN = '현재 대화만으로는 사업에 대한 1차 판단을 내리기 어렵습니다';
const FORBIDDEN_NO_BUSINESS = '사업성이 없다';
const FORBIDDEN_PROBLEM_CHANGED = '문제 가설이 바뀌었습니다';
const FAIL_IF = '문제 지표가 기준 방향으로 움직이지 않았다';
const TAX_LINE = '2026-03-02 반찬가게 A, 3만 원, 1회';

const chatCalls = { count: 0 };
const openaiHttp = { count: 0 };
const provider = {
  chat: () => {
    chatCalls.count += 1;
    return { stub: true };
  },
};

function selected(record: ReturnType<typeof selectNextAction>) {
  const found = record.candidates.find((item) => item.id === record.selectedId);
  if (!found) throw new Error('selected candidate missing');
  return found;
}

function eliminationSet(record: ReturnType<typeof selectNextAction>): string[] {
  return record.eliminated.map((item) => `${item.hypothesisId}:${item.key}`).sort();
}

function narrative(ledger: JudgmentLedger): string {
  return [ledger.judgment, ledger.whyPossible, ledger.whyFail, ledger.decisionChangingEvidence, ledger.validationPriority].join('\n');
}

function answer(ledger: JudgmentLedger, act: FounderAnswerAct): JudgmentLedger {
  return applyFounderAnswer(ledger, selectNextAction(ledger), act).ledger;
}

function confirmCustomer(ledger: JudgmentLedger = createSeedLedger()): JudgmentLedger {
  return answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-customer', proposition: CUSTOMER_CONFIRM });
}

function confirmProblem(ledger: JudgmentLedger = confirmCustomer()): JudgmentLedger {
  return answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-problem', proposition: '주문과 배송을 따로 관리해야 하는 문제가 맞습니다.' });
}

function confirmPayer(ledger: JudgmentLedger = confirmProblem()): JudgmentLedger {
  return answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-payer', proposition: PAYER_CONFIRM });
}

function replaceCustomer(ledger: JudgmentLedger, nextStatement: string): JudgmentLedger {
  return answer(ledger, { kind: 'replace', targetHypothesisId: 'h-customer', nextStatement, proposition: nextStatement });
}

function branchSet(
  id: string,
  stages: [DecisionBranch['stageId'], DecisionBranch['stageId'], DecisionBranch['stageId']],
  verdicts: [DecisionBranch['verdictId'], DecisionBranch['verdictId'], DecisionBranch['verdictId']],
  drops: [boolean, boolean, boolean] = [false, false, false],
): DecisionBranch[] {
  return [0, 1, 2].map((index) => ({
    id: `${id}-${index}`,
    stageId: stages[index],
    verdictId: verdicts[index],
    dropsStage: drops[index],
    judgmentChanges: false,
  }));
}

function tiedValidation(id: string, hypothesisId: string, critical = false): DecisionCandidate {
  return {
    id,
    hypothesisId,
    actionKind: 'validation',
    alreadyKnown: false,
    resolvableByQuestion: false,
    branches: branchSet(
      id,
      ['S2', 'S1', 'S1'],
      ['insufficient_basis', 'judgment_deferred', 'judgment_deferred'],
      [true, false, false],
    ),
    priorityReason: critical ? 'caller-order-reason' : 'other-caller-reason',
    prompt: id,
  };
}

function defineAll(ledger: JudgmentLedger): JudgmentLedger {
  const ids = ['h-customer', 'h-problem', 'h-payer', 'h-business-model', 'h-repeat'];
  return ids.reduce(
    (current, hypothesisId) =>
      defineCriterion(current, {
        hypothesisId,
        measure: hypothesisId,
        passIf: `${hypothesisId} 통과`,
        failIf: hypothesisId === 'h-business-model' ? FAIL_IF : `${hypothesisId} 실패`,
        requiredLiteralScopes: [],
      }),
    ledger,
  );
}

function failBusinessModel(ledger: JudgmentLedger): JudgmentLedger {
  const payment = bindLiteralFact(ledger, {
    hypothesisId: 'h-business-model',
    recordText: TAX_LINE,
    role: 'payment-literal',
  });
  const metric = bindLiteralFact(payment.ledger, {
    hypothesisId: 'h-business-model',
    recordText: '문제 지표가 늘었다',
    role: 'metric:fail',
  });
  const payAccepted = judgeAttribution(metric.ledger, {
    bindingId: payment.binding.id,
    attribution: 'accepted',
    caller: 'si',
  });
  return judgeAttribution(payAccepted, {
    bindingId: metric.binding.id,
    attribution: 'accepted',
    caller: 'si',
  });
}

function headSnapshot(ledger: JudgmentLedger) {
  return {
    judgment: ledger.judgment,
    stageId: ledger.stageId,
    verdictId: ledger.verdictId,
    reviewCompletion: ledger.reviewCompletion,
    headCommitId: ledger.headCommitId,
    outcomes: Object.fromEntries(Object.entries(ledger.hypotheses).map(([id, item]) => [id, item.outcome])),
    classes: Object.fromEntries(Object.entries(ledger.hypotheses).map(([id, item]) => [id, item.evidenceClass])),
  };
}

beforeEach(() => {
  chatCalls.count = 0;
  openaiHttp.count = 0;
  vi.stubGlobal('fetch', (input: unknown) => {
    const url = String(input);
    if (url.includes('api.openai.com') || url.includes('openai')) openaiHttp.count += 1;
    return Promise.resolve(new Response('{}'));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AT-01 frozen conclusion', () => {
  it('moves judgment off the frozen sentence when customer and problem are confirmed', () => {
    const seed = createSeedLedger();
    expect(seed.stageId).toBe('S0');
    expect(seed.verdictId).toBe('insufficient_basis');
    expect(seed.reviewCompletion).toBe('in_progress');
    expect(seed.runStatus).toBe('open');
    for (const id of ['h-customer', 'h-problem', 'h-payer', 'h-business-model', 'h-repeat']) {
      expect(seed.hypotheses[id]?.outcome).toBe('not_run');
    }

    const first = selectNextAction(seed);
    expect(first.hypothesisId).toBe('h-customer');
    expect(first.committedBeforeAnswer).toBe(true);

    const customer = confirmCustomer(seed);
    expect(customer.judgment).toContain('CLAIM');
    expect(customer.judgment).toContain('반찬가게');
    expect(customer.stageId).toBe('S0');
    expect(customer.verdictId).toBe('insufficient_basis');
    expect(customer.hypotheses['h-one-liner']?.outcome).not.toBe('passed');
    expect(customer.hypotheses['h-one-liner']?.evidenceClass).not.toBe('FACT');
    expect(customer.bindings.some((item) => item.evidenceClass === 'FACT')).toBe(false);
    expect(customer.reviewCompletion).not.toBe('closed_complete');

    const second = selectNextAction(customer);
    expect(second.hypothesisId).toBe('h-problem');
    expect(second.selectedId).toBe('q-problem');
    expect(second.eliminated.map((item) => item.hypothesisId)).toEqual(expect.arrayContaining(['h-customer']));
    expect(second.candidates.map((item) => item.id)).toEqual(expect.arrayContaining(['q-payer', 'q-channel']));

    const problem = confirmProblem(customer);
    expect(problem.stageId).toBe('S1');
    expect(problem.verdictId).toBe('judgment_deferred');
    expect(problem.whyPossible).toContain('h-customer');
    expect(problem.whyPossible).toContain('h-problem');
    expect(problem.whyFail).toContain('h-customer');
    expect(problem.whyFail).toContain('h-problem');
    expect(narrative(problem)).not.toContain(FORBIDDEN_FROZEN);
    expect(problem.reviewCompletion).toBe('decision_ready');
    expect(problem.reviewCompletion).not.toBe('closed_complete');
    expect(closeReview(problem).reviewCompletion).not.toBe('closed_complete');
  });
});

describe('AT-02 one-liner stays open', () => {
  it('does not pass or fact-class the one-liner from customer confirmation alone', () => {
    const customer = confirmCustomer();
    expect(customer.hypotheses['h-one-liner']?.outcome).not.toBe('passed');
    expect(customer.hypotheses['h-one-liner']?.evidenceClass).not.toBe('FACT');
  });
});

describe('AT-03 payer text does not replace the customer', () => {
  it('keeps the delivery-merchant customer proposition', () => {
    const paid = confirmPayer();
    expect(paid.hypotheses['h-customer']?.statement).toBe(CUSTOMER_STATEMENT);
    expect(paid.hypotheses['h-customer']?.statement).toContain('배송 소상공인');
    expect(paid.hypotheses['h-customer']?.statement).not.toContain('사장님 본인');
    expect(paid.hypotheses['h-payer']?.evidenceClass).toBe('CLAIM');
  });
});

describe('AT-04 revised customer keeps both statements and asks the new problem', () => {
  it('does not ask the old problem and does not pick a winner inside replace', () => {
    const revised = replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.');
    expect(revised.stageId).toBe('S0');
    expect(revised.verdictId).toBe('insufficient_basis');
    expect(revised.whyPossible).toContain('철회');
    expect(revised.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
    expect(revised.hypotheses['h-customer']?.statement).toBe(CUSTOMER_STATEMENT);
    expect(revised.hypotheses['h-customer-next']?.statement).toContain('물류본부');
    expect(revised.hypotheses['h-customer-next']?.evidenceClass).toBe('CLAIM');
    expect(revised.hypotheses['h-problem-next']?.statement).toBe('');
    expect(revised.hypotheses['h-problem-next']?.pairedCustomerId).toBe('h-customer-next');
    expect(revised.bindings.map((item) => item.id)).toEqual(expect.arrayContaining(['b-customer-doc']));
    expect(revised.conflicts.some((item) => item.hypothesisId === 'h-customer' && !item.resolved)).toBe(true);

    const decision = selectNextAction(revised);
    const choice = selected(decision);
    expect(choice.hypothesisId).toBe('h-problem-next');
    expect(choice.id).toBe('q-problem-next');
    expect(choice.prompt).toContain('물류본부');
    expect(choice.prompt).toContain('짝이 비어');
    expect(choice.prompt).not.toContain(PROBLEM_STATEMENT);
    expect(decision.selectedId).not.toContain('resolve');
    expect(decision.previews?.some((item) => item.act === 'resolve_retain_new')).toBe(true);
    const affirm = previewOf(decision, 'q-problem-next', 'affirm');
    expect(affirm.judgmentChanged).toBe(true);
    expect(affirm.stageChanged).toBe(false);
    expect(decision.priorityReason).toContain('q-problem-next');
    expect(decision.priorityReason).toContain('판단 문장이 달라진다');
    expect(decision.priorityReason).toContain('단계 변화는 없다');
    expect(decision.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(revised.hypotheses['h-problem']?.role).toBe('inactive-preserved');
    expect(decision.candidates.some((item) => item.hypothesisId === 'h-problem')).toBe(false);
    expect(decision.priorityReason).toContain('u-empty-problem');
    expect(closeReview(revised).reviewCompletion).not.toBe('closed_complete');
    expect(closeReview(revised).blockingConflictIds).toContain('h-customer');
  });
});

describe('AT-05 old problem confirmation stays on the new pair', () => {
  it('does not retarget the next action when the old problem sentence is repeated', () => {
    const revised = replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.');
    const before = selectNextAction(revised);
    const answered = applyFounderAnswer(revised, before, { kind: 'affirm', targetHypothesisId: 'h-problem', proposition: PROBLEM_STATEMENT }).ledger;
    expect(answered.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(answered.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
    const after = selectNextAction(answered);
    expect(selected(after).id).toBe('q-problem-next');
    expect(selected(after).hypothesisId).toBe('h-problem-next');
    expect(selected(after).prompt).not.toContain(PROBLEM_STATEMENT);
    expect(after.priorityReason).toBe(before.priorityReason);
    expect(after.priorityReason).not.toContain(FORBIDDEN_PROBLEM_CHANGED);
    expect(narrative(answered)).not.toContain(FORBIDDEN_PROBLEM_CHANGED);
  });
});

describe('AT-06 absence is not a fact on other hypotheses', () => {
  it('stores an absence claim only on the payment hypothesis', () => {
    const before = confirmProblem();
    const next = answer(before, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    expect(next.hypotheses['h-problem']?.evidenceClass).not.toBe('FACT');
    expect(next.hypotheses['h-market']?.evidenceClass).not.toBe('FACT');
    expect(next.hypotheses['h-business-model']?.evidenceClass).toBe('CLAIM');
    expect(next.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    const absence = next.bindings.find((item) => item.classReason === 'absence');
    expect(absence?.evidenceClass).toBe('CLAIM');
    expect(absence?.hypothesisId).toBe('h-business-model');
    expect(next.whyFail).toContain(ABSENCE_SENTENCE);
    expect(next.stageId).toBe(before.stageId);
  });
});

describe('AT-07 weak payment does not move the stage', () => {
  it('keeps a three-payment sentence as a claim', () => {
    const before = confirmProblem();
    const next = answer(before, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    const weak = next.bindings.find((item) => item.proposition === WEAK_PAYMENT_SENTENCE);
    expect(weak?.evidenceClass).toBe('CLAIM');
    expect(weak?.evidenceClass).not.toBe('FACT');
    expect(next.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(next.stageId).toBe(before.stageId);
    expect(next.verdictId).toBe(before.verdictId);
    expect(next.judgment).toContain('주체·금액·기록이 없어 단계를 움직이지 않았다');
  });
});

describe('AT-08 a literal record is not S3', () => {
  it('binds one tax line without authenticity, attribution, or a passing outcome', () => {
    const bound = bindLiteralFact(confirmProblem(), {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    expect(bound.binding.evidenceClass).toBe('FACT');
    expect(bound.binding.authenticityGuaranteed).toBe(false);
    expect(bound.binding.projectAttribution).toBe('unreviewed');
    expect(bound.binding.literalScope).toBe(TAX_LINE);
    expect('stageId' in bound.binding).toBe(false);
    expect(bound.ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(bound.ledger.stageId).not.toBe('S3');
    expect(bound.ledger.hypotheses['h-problem']?.evidenceClass).not.toBe('FACT');
    expect(bound.ledger.hypotheses['h-repeat']?.evidenceClass).not.toBe('FACT');
  });
});

describe('AT-09 conflict keeps both sides', () => {
  it('stays unresolved in either input order', () => {
    const run = (order: 'absence-first' | 'fact-first') => {
      const start = confirmProblem();
      const stageBefore = start.stageId;
      const next =
        order === 'absence-first'
          ? bindLiteralFact(answer(start, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' }), {
              hypothesisId: 'h-business-model',
              recordText: TAX_LINE,
              role: 'payment-literal',
            }).ledger
          : answer(
              bindLiteralFact(start, {
                hypothesisId: 'h-business-model',
                recordText: TAX_LINE,
                role: 'payment-literal',
              }).ledger,
              { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' },
            );
      expect(next.bindings.map((item) => item.id)).toEqual(expect.arrayContaining(['b-absence', 'b-fact-payment-literal-h-business-model']));
      expect(next.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
      expect(next.stageId <= stageBefore || next.stageId === stageBefore).toBe(true);
      expect(next.stageId).not.toBe('S3');
    };
    run('absence-first');
    run('fact-first');
  });
});

describe('AT-10 unknown does not repeat the question hash', () => {
  it('selects a different hash after 모르겠음', () => {
    const ready = confirmProblem();
    const first = selectNextAction(ready);
    const answered = answer(ready, { kind: 'unknown', targetHypothesisId: first.hypothesisId });
    const second = selectNextAction(answered);
    expect(questionHash(second)).not.toBe(questionHash(first));
  });
});

describe('AT-11 tie break ignores candidate order', () => {
  it('keeps selectedId, tieBreak, and priorityReason when the array is reversed', () => {
    const s0 = confirmCustomer();
    const s1 = confirmProblem();
    const problem: DecisionCandidate = {
      id: 'q-problem',
      hypothesisId: 'h-problem',
      actionKind: 'question',
      alreadyKnown: false,
      resolvableByQuestion: true,
      branches: branchSet('q-problem', ['S1', 'S0', 'S0'], ['judgment_deferred', 'insufficient_basis', 'insufficient_basis']),
      priorityReason: 'input-order',
      prompt: '문제 확인',
    };
    const payer: DecisionCandidate = {
      id: 'q-payer',
      hypothesisId: 'h-payer',
      actionKind: 'question',
      alreadyKnown: false,
      resolvableByQuestion: true,
      branches: branchSet('q-payer', ['S0', 'S0', 'S0'], ['insufficient_basis', 'insufficient_basis', 'insufficient_basis']),
      priorityReason: 'input-order-payer',
      prompt: '지불자 확인',
    };
    const channel: DecisionCandidate = {
      id: 'q-channel',
      hypothesisId: 'h-channel',
      actionKind: 'question',
      alreadyKnown: false,
      resolvableByQuestion: true,
      gapId: 'marketChannel',
      branches: branchSet('q-channel', ['S0', 'S0', 'S0'], ['insufficient_basis', 'insufficient_basis', 'insufficient_basis']),
      priorityReason: 'gap-first',
      prompt: '채널 확인',
    };
    const pairs: Array<[JudgmentLedger, DecisionCandidate[]]> = [
      [s0, [payer, problem]],
      [s0, [problem, channel]],
      [recordCriticalUnknown(s1, 'h-repeat'), [tiedValidation('v-repeat', 'h-repeat', true), tiedValidation('v-other', 'h-other')]],
      [recordCriticalUnknown(s1, 'h-customer'), [tiedValidation('v-b', 'h-pay-b'), tiedValidation('v-a', 'h-pay-a')]],
    ];
    for (const [ledger, candidates] of pairs) {
      const forward = selectNextAction(ledger, candidates);
      const reverse = selectNextAction(ledger, candidates.slice().reverse());
      expect(forward.selectedId).toBe(reverse.selectedId);
      expect(forward.tieBreak).toBe(reverse.tieBreak);
      expect(forward.priorityReason).toBe(reverse.priorityReason);
      expect(eliminationSet(forward)).toEqual(eliminationSet(reverse));
      expect(forward.priorityReason).not.toContain('advance after');
      expect(forward.priorityReason).not.toContain('CLOSED');
      expect(forward.priorityReason).not.toContain('target=');
    }

    const t1 = selectNextAction(s0, [payer, problem]);
    expect(t1.selectedId).toBe('q-problem');
    expect(t1.tieBreak).toBe('none');
    const t2 = selectNextAction(s0, [channel, problem]);
    expect(t2.selectedId).toBe('q-problem');
    expect(t2.priorityReason).not.toContain('advance after');
    const t3 = selectNextAction(recordCriticalUnknown(s1, 'h-repeat'), [
      tiedValidation('v-other', 'h-other'),
      tiedValidation('v-repeat', 'h-repeat'),
    ]);
    expect(t3.selectedId).toBe('v-repeat');
    expect(t3.tieBreak).toBe('critical-unknown');
    const t4 = selectNextAction(recordCriticalUnknown(s1, 'h-customer'), [
      tiedValidation('v-b', 'h-pay-b'),
      tiedValidation('v-a', 'h-pay-a'),
    ]);
    expect(t4.selectedId).toBe('v-a');
    expect(t4.tieBreak).toBe('stable-id');
    expect(t4.priorityReason).toContain('stable-id');
    expect(t4.priorityReason).toContain('사업 근거가 아니다');
  });
});

describe('AT-12 stage, run status, and review completion stay apart', () => {
  it('does not complete the review at S3 while repeat is open, including after budget hold', () => {
    const prepared = defineCriterion(confirmPayer(), {
      hypothesisId: 'h-business-model',
      measure: '결제와 문제 지표',
      passIf: '지표가 줄고 결제가 귀속된다',
      failIf: FAIL_IF,
      requiredLiteralScopes: [TAX_LINE],
    });
    const payment = bindLiteralFact(prepared, {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    const metric = bindLiteralFact(payment.ledger, {
      hypothesisId: 'h-business-model',
      recordText: '주문 누락이 줄었다',
      role: 'metric:pass',
    });
    const acceptedPay = judgeAttribution(metric.ledger, {
      bindingId: payment.binding.id,
      attribution: 'accepted',
      caller: 'si',
    });
    const passed = judgeAttribution(acceptedPay, {
      bindingId: metric.binding.id,
      attribution: 'accepted',
      caller: 'si',
    });
    expect(passed.stageId).toBe('S3');
    expect(passed.hypotheses['h-business-model']?.outcome).toBe('passed');
    expect(passed.hypotheses['h-repeat']?.outcome).toBe('not_run');
    const first = closeReview(passed);
    expect(first.reviewCompletion).not.toBe('closed_complete');
    expect(first.blockingHypothesisIds).toContain('h-repeat');
    const held = applyBudgetHold(first.ledger);
    expect(held.runStatus).toBe('budget_held');
    expect(held.stageId).toBe(first.ledger.stageId);
    expect(held.verdictId).toBe(first.ledger.verdictId);
    const second = closeReview(held);
    expect(second.reviewCompletion).toBe(first.reviewCompletion);
    expect(second.ledger.stageId).toBe(first.ledger.stageId);
    expect(second.blockingHypothesisIds).toEqual(first.blockingHypothesisIds);
  });
});

describe('AT-13 closeReview is a whole-review gate', () => {
  it('completes only when every required hypothesis is judged and no conflict remains', () => {
    const base = defineAll(confirmPayer());
    const judged = ['h-customer', 'h-problem', 'h-payer', 'h-repeat'].reduce(
      (current, id) => judgeRequiredHypothesis(current, id, 'passed', 'si'),
      base,
    );
    const failed = failBusinessModel(judged);
    expect(failed.hypotheses['h-business-model']?.outcome).toBe('failed');
    expect(failed.verdictId).toBe('judgment_deferred');

    const caseA = closeReview(failed);
    expect(caseA.reviewCompletion).toBe('closed_complete');
    expect(caseA.blockingHypothesisIds).toEqual([]);
    expect(caseA.blockingConflictIds).toEqual([]);
    expect(caseA.ledger.verdictId).toBe('judgment_deferred');
    expect(narrative(caseA.ledger)).toContain(FAIL_IF);
    expect(narrative(caseA.ledger)).not.toContain(FORBIDDEN_NO_BUSINESS);
    expect(narrative(caseA.ledger)).not.toContain(FORBIDDEN_FROZEN);

    const caseBLedger = recordCriticalUnknown(
      failBusinessModel(
        ['h-customer', 'h-problem', 'h-payer'].reduce(
          (current, id) => judgeRequiredHypothesis(current, id, 'passed', 'si'),
          base,
        ),
      ),
      'h-business-model',
    );
    expect(caseBLedger.criticalUnknownHypothesisId).toBe('h-business-model');
    expect(caseBLedger.hypotheses['h-business-model']?.outcome).toBe('failed');
    expect(caseBLedger.hypotheses['h-repeat']?.outcome).toBe('not_run');
    const caseB = closeReview(caseBLedger);
    expect(caseB.reviewCompletion).not.toBe('closed_complete');
    expect(caseB.blockingHypothesisIds).toContain('h-repeat');
    expect(caseB.ledger.hypotheses['h-business-model']?.outcome).toBe('failed');

    const caseCLedger = recordConflict(failed, {
      hypothesisId: 'h-customer',
      left: { id: 'b-customer-old', proposition: CUSTOMER_STATEMENT, sourceKind: 'founder_answer' },
      right: { id: 'b-customer-other', proposition: '다른 고객', sourceKind: 'record' },
    });
    expect(caseCLedger.hypotheses['h-business-model']?.outcome).toBe('failed');
    expect(caseCLedger.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
    const caseC = closeReview(caseCLedger);
    expect(caseC.reviewCompletion).not.toBe('closed_complete');
    expect(caseC.blockingConflictIds).toContain('h-customer');
    expect(caseC.ledger.hypotheses['h-business-model']?.outcome).toBe('failed');
  });
});

describe('AT-14 zero network and unchanged ledger', () => {
  it('makes no chat call and no OpenAI HTTP request, and a stub does not change the head', () => {
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../si-judgment-contract.ts'), 'utf8');
    expect(source).not.toContain('api.openai.com');
    expect(source).not.toContain('openai-http');
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\.chat\s*\(/);

    const seed = createSeedLedger();
    const customer = confirmCustomer(seed);
    const problem = confirmProblem(customer);
    replaceCustomer(problem, '우리 고객은 물류본부다.');
    answer(problem, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    answer(problem, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    bindLiteralFact(problem, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    selectNextAction(problem);
    answer(problem, { kind: 'unknown', targetHypothesisId: 'h-payer' });
    selectNextAction(confirmCustomer(), [
      {
        id: 'q-problem',
        hypothesisId: 'h-problem',
        actionKind: 'question',
        alreadyKnown: false,
        resolvableByQuestion: true,
        branches: branchSet('q-problem', ['S1', 'S0', 'S0'], ['judgment_deferred', 'insufficient_basis', 'insufficient_basis']),
        priorityReason: '',
        prompt: '문제',
      },
    ]);
    const passedBase = defineCriterion(confirmPayer(), {
      hypothesisId: 'h-business-model',
      measure: '결제',
      passIf: '통과',
      failIf: FAIL_IF,
      requiredLiteralScopes: [],
    });
    const payment = bindLiteralFact(passedBase, {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    const metric = bindLiteralFact(payment.ledger, {
      hypothesisId: 'h-business-model',
      recordText: '지표가 줄었다',
      role: 'metric:pass',
    });
    const s3 = judgeAttribution(
      judgeAttribution(metric.ledger, { bindingId: payment.binding.id, attribution: 'accepted', caller: 'si' }),
      { bindingId: metric.binding.id, attribution: 'accepted', caller: 'si' },
    );
    closeReview(s3);
    applyBudgetHold(s3);
    const failed = failBusinessModel(defineAll(confirmPayer()));
    closeReview(failed);

    const before = headSnapshot(s3);
    const rejected = offerModelDraft(s3, { stub: true }, provider);
    expect(rejected.rejected).toBe(true);
    expect(headSnapshot(rejected.ledger)).toEqual(before);
    const rejectedText = offerModelDraft(s3, 'viable VALIDATED', provider);
    expect(headSnapshot(rejectedText.ledger)).toEqual(before);

    expect(chatCalls.count).toBe(0);
    expect(openaiHttp.count).toBe(0);
  });
});

function previewOf(record: ReturnType<typeof selectNextAction>, candidateId: string, act: string) {
  const found = record.previews?.find((item) => item.candidateId === candidateId && item.act === act);
  if (!found) throw new Error(`missing preview ${candidateId} ${act}`);
  return found;
}

function assertHonestStageReason(record: ReturnType<typeof selectNextAction>) {
  const winner = (record.previews ?? []).filter((item) => item.candidateId === record.selectedId);
  const claimsStage = /단계를 .+에서 .+로 바꾼다|유일한 단계 변화/.test(record.priorityReason);
  if (claimsStage && winner.every((item) => !item.stageChanged)) {
    throw new Error(`stage claim without stage change: ${record.priorityReason}`);
  }
}

describe('supplement A conflict resolution', () => {
  it('keeps both bindings and reaches closed_complete only after real judgments', () => {
    const revised = replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.');
    const conflict = revised.conflicts.find((item) => item.hypothesisId === 'h-customer' && !item.resolved);
    if (!conflict) throw new Error('conflict missing');
    expect(evaluateHypothesis(revised, 'h-customer')).toBe('conflict_unresolved');
    expect(evaluateStage(revised)).toEqual({ stageId: 'S0', verdictId: 'insufficient_basis' });
    expect(revised.hypotheses['h-customer-next']?.evidenceClass).toBe('CLAIM');
    const stopped = closeReview(revised, { founderStopped: true });
    expect(stopped.reviewCompletion).toBe('closed_incomplete');
    expect(stopped.blockingConflictIds).toContain('h-customer');
    expect(() => resolveConflict(revised, { hypothesisId: 'h-customer', evidenceId: conflict.rightId, reason: '  ' })).toThrow();
    expect(() => resolveConflict(revised, { hypothesisId: 'h-customer', evidenceId: 'missing-binding', reason: '이유' })).toThrow();

    const resolved = resolveConflict(revised, {
      hypothesisId: 'h-customer',
      evidenceId: conflict.rightId,
      reason: '새 고객을 작업 기준으로 둔다',
    });
    expect(evaluateHypothesis(resolved, 'h-customer')).toBe('not_run');
    expect(resolved.hypotheses['h-customer']?.statement).toContain('물류본부');
    expect(resolved.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    expect(resolved.hypotheses['h-customer']?.outcome).toBe('not_run');
    expect(resolved.stageId).toBe('S0');
    expect(resolved.verdictId).toBe('insufficient_basis');
    expect(resolved.bindings.map((item) => item.id)).toEqual(expect.arrayContaining([conflict.leftId, conflict.rightId]));
    expect(resolved.bindings.find((item) => item.id === conflict.rightId)?.projectAttribution).toBe('unreviewed');
    expect(resolved.bindings.some((item) => item.classReason === 'conflict-resolution' && item.evidenceClass === 'CLAIM')).toBe(true);
    expect(resolved.activePairCustomerId).toBe('h-customer-next');
    const opened = closeReview(resolved);
    expect(opened.reviewCompletion).not.toBe('closed_complete');
    expect(opened.blockingConflictIds).not.toContain('h-customer');
    expect(opened.blockingHypothesisIds).toContain('h-customer');

    const kept = resolveConflict(revised, {
      hypothesisId: 'h-customer',
      evidenceId: conflict.leftId,
      reason: '옛 고객을 작업 기준으로 둔다',
    });
    expect(kept.hypotheses['h-customer']?.statement).toBe(revised.bindings.find((item) => item.id === conflict.leftId)?.proposition);
    expect(kept.bindings.find((item) => item.id === 'b-customer-doc')?.proposition).toBe(CUSTOMER_STATEMENT);
    expect(kept.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(kept.bindings.map((item) => item.id)).toEqual(expect.arrayContaining([conflict.leftId, conflict.rightId]));
    expect(evaluateHypothesis(kept, 'h-customer')).toBe('not_run');
    expect(closeReview(kept).reviewCompletion).not.toBe('closed_complete');

    const paired = answer(resolved, {
      kind: 'affirm',
      targetHypothesisId: 'h-problem-next',
      proposition: '배차 기준이 현장에 없다',
    });
    expect(paired.hypotheses['h-problem-next']?.evidenceClass).toBe('CLAIM');
    expect(paired.hypotheses['h-problem-next']?.statement).toBe('배차 기준이 현장에 없다');
    expect(paired.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(paired.hypotheses['h-problem']?.role).toBe('inactive-preserved');
    expect(paired.stageId).toBe('S1');
    const prepared = defineAll(answer(paired, { kind: 'affirm', targetHypothesisId: 'h-payer', proposition: PAYER_CONFIRM }));
    const judged = ['h-customer', 'h-problem', 'h-payer', 'h-repeat'].reduce(
      (current, id) => judgeRequiredHypothesis(current, id, 'passed', 'si'),
      prepared,
    );
    const completed = closeReview(failBusinessModel(judged));
    expect(completed.reviewCompletion).toBe('closed_complete');
    expect(completed.blockingConflictIds).toEqual([]);
    expect(completed.ledger.hypotheses['h-customer-next']?.outcome).not.toBe('passed');
    expect(completed.ledger.hypotheses['h-problem']?.outcome).not.toBe('passed');
    expect(completed.ledger.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(completed.ledger.hypotheses['h-problem-next']?.outcome).toBe('passed');
  });

  it('does not pass an unresolved payment fact', () => {
    const start = confirmProblem();
    const absent = answer(start, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    const conflicted = bindLiteralFact(absent, {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    }).ledger;
    expect(conflicted.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
    const factId = 'b-fact-payment-literal-h-business-model';
    const resolved = resolveConflict(conflicted, {
      hypothesisId: 'h-business-model',
      evidenceId: factId,
      reason: '문자 기록을 작업 기준으로 둔다',
    });
    expect(resolved.bindings.map((item) => item.id)).toEqual(expect.arrayContaining(['b-absence', factId]));
    expect(resolved.bindings.find((item) => item.id === factId)?.projectAttribution).toBe('unreviewed');
    expect(evaluateHypothesis(resolved, 'h-business-model')).toBe('insufficient_record');
    expect(resolved.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(resolved.stageId).not.toBe('S3');
    expect(closeReview(resolved).reviewCompletion).not.toBe('closed_complete');
  });
});

describe('supplement B preview ranking', () => {
  it('names the assumed branch and refuses a stage reason without a stage change', () => {
    const seed = createSeedLedger();
    const first = selectNextAction(seed);
    assertHonestStageReason(first);
    expect(first.selectedId).toBe('q-customer');
    expect(first.hypothesisId).toBe('h-customer');
    expect(first.tieBreak).toBe('uncertainty-closed');
    expect(first.priorityReason).toContain('단계 변화는 없다');
    expect(first.priorityReason).not.toContain('유일한 단계 변화');
    const customerAffirm = previewOf(first, 'q-customer', 'affirm');
    expect(customerAffirm.judgmentChangeClass).toBe('identity');
    expect(customerAffirm.stageChanged).toBe(false);
    expect(customerAffirm.verdictChanged).toBe(false);
    expect(customerAffirm.criticalUnknownAfter).toBe('h-problem');
    const customerReplace = previewOf(first, 'q-customer', 'replace');
    expect(customerReplace.judgmentChangeClass).toBe('conflict');
    expect(customerReplace.stageChanged).toBe(false);
    expect(customerReplace.outcomeAfter).toBe('conflict_unresolved');
    expect(previewOf(first, 'q-customer', 'unknown').judgmentChangeClass).toBe('annotation');
    expect(previewOf(first, 'q-problem', 'affirm').stageChanged).toBe(false);
    expect(previewOf(first, 'q-channel', 'affirm').judgmentChangeClass).toBe('none');
    expect(previewOf(first, 'q-channel', 'replace').judgmentChangeClass).toBe('none');
    expect(previewOf(first, 'q-channel', 'unknown').judgmentChangeClass).toBe('none');
    expect(first.candidates.map((item) => item.id)).toEqual(expect.arrayContaining(['q-channel']));
    expect(first.selectedId).not.toBe('q-channel');
    expect(previewOf(first, 'v-business-model', 'payment_claim').stageAfter).not.toBe('S3');
    expect(previewOf(first, 'v-business-model', 'absence_claim').stageChanged).toBe(false);
    expect(previewOf(first, 'v-business-model', 'criterion_defined').stageChanged).toBe(false);

    const customer = confirmCustomer();
    const problemChoice = selectNextAction(customer);
    assertHonestStageReason(problemChoice);
    const problemAffirm = previewOf(problemChoice, 'q-problem', 'affirm');
    expect(problemChoice.hypothesisId).toBe('h-problem');
    expect(problemAffirm.stageBefore).toBe('S0');
    expect(problemAffirm.stageAfter).toBe('S1');
    expect(problemAffirm.stageChanged).toBe(true);
    expect(problemAffirm.verdictBefore).toBe('insufficient_basis');
    expect(problemAffirm.verdictAfter).toBe('judgment_deferred');
    expect(problemAffirm.judgmentChangeClass).toBe('identity');
    expect(problemChoice.priorityReason).toContain('u-unconfirmed-h-problem');
    expect(problemChoice.priorityReason).toContain('선택 이유가 아니다');
    expect(problemChoice.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);

    const ready = confirmProblem();
    const payerChoice = selectNextAction(ready);
    assertHonestStageReason(payerChoice);
    expect(payerChoice.hypothesisId).toBe('h-payer');
    expect(payerChoice.tieBreak).toBe('uncertainty-closed');
    expect(previewOf(payerChoice, 'q-payer', 'affirm').stageChanged).toBe(false);
    expect(previewOf(payerChoice, 'v-business-model', 'criterion_defined').stageChanged).toBe(false);
    expect(payerChoice.priorityReason).toContain('단계 변화는 없다');
    expect(payerChoice.priorityReason).not.toContain('유일한 단계 변화');

    const payerOnly = applyFounderAnswer(seed, first, {
      kind: 'affirm',
      targetHypothesisId: 'h-payer',
      proposition: PAYER_CONFIRM,
    }).ledger;
    expect(payerOnly.hypotheses['h-customer']?.evidenceClass).toBe('ASSUMPTION');
    expect(payerOnly.hypotheses['h-payer']?.evidenceClass).toBe('CLAIM');
    expect(payerOnly.judgment).toContain('사장님 본인');
    expect(payerOnly.judgment).toContain('가정');
    const backToCustomer = selectNextAction(payerOnly);
    assertHonestStageReason(backToCustomer);
    expect(backToCustomer.hypothesisId).toBe('h-customer');
    expect(backToCustomer.tieBreak).not.toBe('stable-id');
    expect(backToCustomer.hypothesisId).not.toBe('h-channel');

    const opened = replaceCustomer(createSeedLedger(), '다른 작업 기준 고객');
    const pairChoice = selectNextAction(opened);
    assertHonestStageReason(pairChoice);
    expect(pairChoice.hypothesisId).toBe('h-problem-next');
    expect(pairChoice.selectedId).toBe('q-problem-next');
    expect(pairChoice.priorityReason).toContain('단계 변화는 없다');
    expect(pairChoice.priorityReason).toContain('판단 문장이 달라진다');
    expect(pairChoice.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(previewOf(pairChoice, 'q-resolve-h-customer', 'resolve_retain_new').judgmentChangeClass).toBe('conflict');
    expect(previewOf(pairChoice, 'q-resolve-h-customer', 'resolve_retain_new').outcomeAfter).toBe('not_run');
    expect(previewOf(pairChoice, 'q-resolve-h-customer', 'resolve_retain_new').stageChanged).toBe(false);
    expect(previewOf(pairChoice, 'q-resolve-h-customer', 'resolve_retain_old').stageChanged).toBe(false);
    expect(previewOf(pairChoice, 'q-resolve-h-customer', 'unknown').outcomeAfter).toBe('conflict_unresolved');
  });
});

describe('causal recovery fixtures', () => {
  it('judges a non-seed spine without copying the seed business', () => {
    const ledger = createProjectLedger({
      customerStatement: '전통주를 선물·취미로 찾는 30–40대',
      problemStatement: '양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다',
      businessStatement: '전통주 브랜드',
    });
    expect(ledger.hypotheses['h-customer']?.statement).toBe('전통주를 선물·취미로 찾는 30–40대');
    expect(ledger.judgment).toContain('전통주');
    expect(ledger.judgment).not.toContain('반찬가게');
    const confirmed = answer(ledger, {
      kind: 'affirm',
      targetHypothesisId: 'h-customer',
      proposition: '이 서비스를 가장 필요로 하는 사람은 전통주를 선물·취미로 찾는 30–40대입니다.',
    });
    expect(confirmed.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    expect(confirmed.stageId).toBe('S0');
    expect(confirmed.judgment).toContain('전통주를 선물·취미로 찾는 30–40대');
    expect(confirmed.judgment).toContain('CLAIM');
    expect(confirmed.judgment).not.toContain('반찬가게');
    const next = selectNextAction(confirmed);
    expect(next.hypothesisId).toBe('h-problem');
    expect(next.prompt).toContain('양조장마다 채널이 흩어져');

    const paid = applyFounderAnswer(ledger, selectNextAction(ledger), {
      kind: 'payment_claim',
      proposition: WEAK_PAYMENT_SENTENCE,
      targetHypothesisId: 'h-business-model',
    }).ledger;
    expect(paid.bindings.some((item) => item.classReason === 'weak-payment' && item.evidenceClass === 'CLAIM')).toBe(true);
    expect(paid.stageId).toBe(ledger.stageId);
    expect(paid.judgment).toContain(WEAK_PAYMENT_SENTENCE);
    expect(paid.judgment).toContain('전통주');
    expect(paid.judgment).toContain('가정');
    expect(paid.judgment).not.toContain('반찬가게');
    expect(selectNextAction(paid).hypothesisId).toBe('h-customer');

    const absent = applyFounderAnswer(ledger, selectNextAction(ledger), {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    }).ledger;
    expect(absent.judgment).toContain(ABSENCE_SENTENCE);
    expect(absent.hypotheses['h-problem']?.evidenceClass).not.toBe('FACT');
    expect(absent.hypotheses['h-market']?.evidenceClass).not.toBe('FACT');
  });
});

describe('revise next action', () => {
  it('asks the new problem for the revised customer and leaves conflict resolution as a separate act', () => {
    const problem = '양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다';
    const ledger = createProjectLedger({
      customerStatement: '전통주를 선물·취미로 찾는 30–40대',
      problemStatement: problem,
      businessStatement: '전통주 브랜드',
    });
    const revised = answer(ledger, {
      kind: 'replace',
      targetHypothesisId: 'h-customer',
      nextStatement: '이 브랜드를 가장 필요로 하는 사람은 혼자 마시는 20대입니다.',
    });
    expect(revised.hypotheses['h-customer']?.statement).toBe('전통주를 선물·취미로 찾는 30–40대');
    expect(revised.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
    expect(revised.hypotheses['h-customer-next']?.evidenceClass).toBe('CLAIM');
    expect(revised.hypotheses['h-customer-next']?.statement).toContain('혼자 마시는 20대');
    expect(revised.hypotheses['h-problem']?.statement).toBe(problem);
    expect(revised.hypotheses['h-problem-next']?.statement).toBe('');
    expect(revised.hypotheses['h-problem-next']?.pairedCustomerId).toBe('h-customer-next');
    expect(revised.bindings.map((item) => item.id)).toEqual(expect.arrayContaining(['b-customer-doc', 'b-problem-doc']));
    expect(revised.judgment).toContain('전통주를 선물·취미로 찾는 30–40대');
    expect(revised.judgment).toContain('혼자 마시는 20대');
    expect(revised.judgment).toContain('활성 판단의 문제는 아직 확인되지 않았다');
    expect(revised.judgment).toContain('이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다');
    expect(revised.judgment).toContain('새 고객에 대한 판정이 아니다');
    expect(revised.judgment).not.toContain('어느 쪽도 작업 기준이 아니다');
    const active = revised.judgment.split('과거 기록')[0] ?? '';
    expect(active).toContain('혼자 마시는 20대');
    expect(active).not.toContain(problem);
    expect(revised.criticalUnknownHypothesisId).toBe('h-problem-next');

    const decision = selectNextAction(revised);
    assertHonestStageReason(decision);
    expect(decision.hypothesisId).toBe('h-problem-next');
    expect(decision.selectedId).toBe('q-problem-next');
    expect(decision.prompt).toContain('혼자 마시는 20대');
    expect(decision.prompt).not.toContain(problem);
    const affirm = previewOf(decision, 'q-problem-next', 'affirm');
    expect(affirm.hypothesisId).toBe('h-problem-next');
    expect(affirm.judgmentChanged).toBe(true);
    expect(affirm.stageChanged).toBe(false);
    expect(affirm.judgmentAfter).toContain('혼자 마시는 20대');
    expect(decision.priorityReason).toContain('q-problem-next');
    expect(decision.priorityReason).toContain('판단 문장이 달라진다');
    expect(decision.priorityReason).toContain('단계 변화는 없다');
    expect(decision.previews?.some((item) => item.candidateId === 'q-resolve-h-customer' && item.act === 'resolve_retain_new')).toBe(true);
    expect(revised.conflicts.some((item) => item.hypothesisId === 'h-customer' && !item.resolved)).toBe(true);
  });
});

describe('payment next action', () => {
  it('asks whose payment instead of repeating the open problem sentence', () => {
    const problem = '메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다';
    const ledger = createProjectLedger({
      customerStatement: '직원 20–80명 제조사 영업관리자',
      problemStatement: problem,
      businessStatement: '견적 자동화',
    });
    const customer = answer(ledger, {
      kind: 'affirm',
      targetHypothesisId: 'h-customer',
      proposition: '이 서비스를 가장 필요로 하는 사람은 직원 20–80명 제조사 영업관리자입니다.',
    });
    const asked = selectNextAction(customer);
    expect(asked.hypothesisId).toBe('h-problem');
    const paid = applyFounderAnswer(customer, asked, {
      kind: 'payment_claim',
      proposition: WEAK_PAYMENT_SENTENCE,
      targetHypothesisId: 'h-business-model',
    }).ledger;
    expect(paid.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    expect(paid.hypotheses['h-problem']?.evidenceClass).not.toBe('CLAIM');
    expect(paid.judgment).toContain(WEAK_PAYMENT_SENTENCE);
    expect(paid.stageId).toBe('S0');

    const next = selectNextAction(paid);
    assertHonestStageReason(next);
    expect(next.hypothesisId).toBe('h-payer');
    expect(next.selectedId).toBe('q-payer');
    expect(paid.criticalUnknownHypothesisId).toBe('h-payer');
    expect(next.prompt).toContain('누구의 결제');
    expect(next.prompt).toContain('금액과 거래 기록은 이 질문으로 생기지 않는다');
    expect(next.prompt).not.toContain(problem);
    expect(next.prompt).not.toContain('더 좁혀');
    expect(next.selectedId).not.toBe('v-business-model');
    expect(next.selectedId).not.toBe('q-problem');
    const payerAffirm = previewOf(next, 'q-payer', 'affirm');
    expect(payerAffirm.judgmentChanged).toBe(true);
    expect(payerAffirm.stageChanged).toBe(false);
    expect(payerAffirm.hypothesisId).toBe('h-payer');
    const problemAffirm = previewOf(next, 'q-problem', 'affirm');
    expect(problemAffirm.stageChanged).toBe(true);
    expect(problemAffirm.stageBefore).toBe('S0');
    expect(problemAffirm.stageAfter).toBe('S1');
    const ranked = next.candidates.map((item) => item.id);
    expect(ranked[0]).toBe('q-payer');
    expect(ranked.indexOf('q-payer')).toBeLessThan(ranked.indexOf('q-problem'));
    expect(next.tieBreak).toBe('uncertainty-closed');
    expect(next.priorityReason).toContain('q-payer');
    expect(next.priorityReason).toContain('u-payer');
    expect(next.priorityReason).toContain('판단 문장이 달라진다');
    expect(next.priorityReason).toContain('q-problem는 u-payer를 남긴다');
    expect(next.priorityReason).toContain('단계 변화는 없다');
    expect(next.priorityReason).toContain('사업 성과를 확정하지 않는다');
    expect(next.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
  });

  it('asks for a literal record after an absence claim instead of repeating the problem', () => {
    const problem = '메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다';
    const ledger = createProjectLedger({
      customerStatement: '직원 20–80명 제조사 영업관리자',
      problemStatement: problem,
      businessStatement: '견적 자동화',
    });
    const customer = answer(ledger, {
      kind: 'affirm',
      targetHypothesisId: 'h-customer',
      proposition: '이 서비스를 가장 필요로 하는 사람은 직원 20–80명 제조사 영업관리자입니다.',
    });
    const asked = selectNextAction(customer);
    const absent = applyFounderAnswer(customer, asked, {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    }).ledger;
    const next = selectNextAction(absent);
    assertHonestStageReason(next);
    expect(next.selectedId).toBe('v-business-model');
    expect(next.hypothesisId).toBe('h-business-model');
    expect(next.prompt).toContain('문자 기록');
    expect(next.prompt).toContain('기록이 생기지 않는다');
    expect(next.prompt).not.toContain('누구의 결제');
    expect(next.prompt).not.toContain(problem);
    const literal = previewOf(next, 'v-business-model', 'literal_unreviewed');
    expect(literal.judgmentChangeClass).toBe('conflict');
    expect(literal.stageChanged).toBe(false);
    const problemAffirm = previewOf(next, 'q-problem', 'affirm');
    expect(problemAffirm.stageAfter).toBe('S1');
    const ranked = next.candidates.map((item) => item.id);
    expect(ranked[0]).toBe('v-business-model');
    expect(ranked.indexOf('v-business-model')).toBeLessThan(ranked.indexOf('q-problem'));
    expect(next.priorityReason).toContain('literal_unreviewed');
    expect(next.priorityReason).toContain('conflict');
    expect(next.priorityReason).toContain('필요한 증거는 주체와 금액이 적힌 문자 기록');
    expect(next.priorityReason).toContain('단계 변화는 없다');
    expect(next.candidates[0]?.resolvableByQuestion).toBe(false);
    expect(next.candidates[0]?.alreadyKnown).toBe(false);
  });

  it('records missing evidence when the remaining questions cannot create a payment record', () => {
    const ready = confirmProblem();
    const payer = answer(ready, { kind: 'affirm', targetHypothesisId: 'h-payer', proposition: PAYER_CONFIRM });
    const absent = answer(payer, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    const next = selectNextAction(absent);
    assertHonestStageReason(next);
    expect(next.selectedId).toBe('v-business-model');
    expect(next.hypothesisId).toBe('h-business-model');
    expect(next.prompt).not.toContain(PROBLEM_STATEMENT);
    expect(next.priorityReason).toContain('필요한 증거는 주체와 금액이 적힌 문자 기록');
    expect(next.priorityReason).toContain('문제 문장을 다시 확인해도 기록이 생기지 않는다');
    expect(next.candidates.some((item) => item.id === 'q-problem')).toBe(false);
    expect(next.eliminated).toEqual(expect.arrayContaining([expect.objectContaining({ hypothesisId: 'h-problem', key: 'alreadyKnown' })]));
  });
});

describe('revised customer judgment stays on the active customer', () => {
  it('separates the new problem from the old problem and then asks the active payer', () => {
    const cases = [
      {
        customer: '전통주를 선물·취미로 찾는 30–40대',
        problem: '양조장마다 채널이 흩어져 소비자가 좋은 술을 발견하기 어렵다',
        business: '전통주 브랜드',
        revised: '이 브랜드를 가장 필요로 하는 사람은 혼자 마시는 20대입니다.',
        nextProblem: '동네 편의점에는 찾는 술이 없다',
        confirmProblemFirst: false,
      },
      {
        customer: '직원 20–80명 제조사 영업관리자',
        problem: '메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다',
        business: '견적 자동화',
        revised: '이 툴을 가장 필요로 하는 사람은 개인 프리랜서입니다.',
        nextProblem: '견적 문서를 혼자 다시 쓴다',
        confirmProblemFirst: true,
      },
    ];
    for (const item of cases) {
      let ledger = createProjectLedger({
        customerStatement: item.customer,
        problemStatement: item.problem,
        businessStatement: item.business,
      });
      if (item.confirmProblemFirst) {
        ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-customer', proposition: item.customer });
        ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-problem', proposition: item.problem });
      }
      const revised = answer(ledger, { kind: 'replace', targetHypothesisId: 'h-customer', nextStatement: item.revised });
      const before = selectNextAction(revised);
      const activeBefore = revised.judgment.split('과거 기록')[0] ?? '';
      const historyBefore = revised.judgment.split('과거 기록').slice(1).join('과거 기록');
      expect(activeBefore).toContain(item.revised);
      expect(activeBefore).toContain('활성 판단의 문제는 아직 확인되지 않았다');
      expect(activeBefore).not.toContain(item.problem);
      expect(historyBefore).toContain(item.customer);
      expect(historyBefore).toContain(item.problem);
      expect(historyBefore).toContain('이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다');
      expect(historyBefore).toContain('새 고객에 대한 판정이 아니다');
      expect(before.hypothesisId).toBe('h-problem-next');
      expect(before.selectedId).toBe('q-problem-next');
      expect(revised.criticalUnknownHypothesisId).toBe(before.hypothesisId);
      expect(revised.bindings.some((binding) => binding.id === 'b-problem-doc' && binding.proposition === item.problem)).toBe(true);

      const filled = applyFounderAnswer(revised, before, {
        kind: 'affirm',
        targetHypothesisId: 'h-problem-next',
        proposition: item.nextProblem,
      }).ledger;
      const activeAfter = filled.judgment.split('과거 기록')[0] ?? '';
      const historyAfter = filled.judgment.split('과거 기록').slice(1).join('과거 기록');
      expect(filled.stageId).toBe('S0');
      expect(filled.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
      expect(filled.hypotheses['h-problem']?.statement).toBe(item.problem);
      expect(filled.hypotheses['h-problem-next']?.statement).toBe(item.nextProblem);
      expect(filled.hypotheses['h-problem-next']?.evidenceClass).toBe('CLAIM');
      expect(activeAfter).toContain(item.revised);
      expect(activeAfter).toContain(item.nextProblem);
      expect(activeAfter).toContain('이 문제는 새 고객의 문제이며 과거 문제와 다르다');
      expect(activeAfter).not.toContain(item.problem);
      expect(historyAfter).toContain(item.problem);
      expect(historyAfter).toContain('이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다');
      const after = selectNextAction(filled);
      assertHonestStageReason(after);
      expect(after.hypothesisId).toBe('h-customer');
      expect(after.selectedId).toBe('q-resolve-h-customer');
      expect(after.selectedId).not.toBe('q-payer');
      expect(after.hypothesisId).not.toBe('h-problem');
      expect(after.prompt).not.toContain(item.problem);
      expect(filled.uncertainties[0]?.id).toBe('u-conflict-h-customer');
      expect(after.priorityReason).toContain('u-conflict-h-customer');
      expect(after.priorityReason).toContain('q-payer는 u-conflict-h-customer를 남긴다');
      expect(after.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
      expect(previewOf(after, 'q-resolve-h-customer', 'resolve_retain_old').stageChanged).toBe(item.confirmProblemFirst);
    }
  });
});

function citedPreview(record: ReturnType<typeof selectNextAction>) {
  const acts = ['literal_unreviewed', 'resolve_retain_new', 'resolve_retain_old', 'payment_claim', 'absence_claim', 'criterion_defined', 'affirm', 'replace', 'unknown'];
  const act = acts.find((name) => record.priorityReason.includes(name));
  if (!act) return undefined;
  return previewOf(record, record.selectedId, act);
}

function assertReasonMatchesCitedPreview(record: ReturnType<typeof selectNextAction>) {
  const cited = citedPreview(record);
  const reason = record.priorityReason;
  if (cited && reason.includes('판단 문장이 달라진다')) expect(cited.judgmentChanged).toBe(true);
  if (cited && reason.includes('판단 문장은 그대로다')) expect(cited.judgmentChanged).toBe(false);
  if (cited && reason.includes('단계 변화는 없다')) expect(cited.stageChanged).toBe(false);
  const moved = reason.match(/단계를 (S\d)에서 (S\d)로 바꾼다/);
  if (cited && moved) {
    expect(cited.stageChanged).toBe(true);
    expect(cited.stageBefore).toBe(moved[1]);
    expect(cited.stageAfter).toBe(moved[2]);
  }
  if (cited && /등급은 conflict|등급 conflict/.test(reason)) expect(cited.judgmentChangeClass).toBe('conflict');
  assertHonestStageReason(record);
}

describe('verification spec 9a1c0aad', () => {
  it('compares a real S1 change with a payment claim that stays at S0', () => {
    const seed = createSeedLedger();
    const before = {
      stageId: seed.stageId,
      verdictId: seed.verdictId,
      judgment: seed.judgment,
      customerClass: seed.hypotheses['h-customer']?.evidenceClass,
      problemClass: seed.hypotheses['h-problem']?.evidenceClass,
    };
    expect(before).toEqual({
      stageId: 'S0',
      verdictId: 'insufficient_basis',
      judgment: expect.stringContaining('아직 확인되지 않은 가정이다'),
      customerClass: 'ASSUMPTION',
      problemClass: 'ASSUMPTION',
    });

    const customerOnly = confirmCustomer(seed);
    expect(customerOnly.stageId).toBe('S0');
    expect(customerOnly.verdictId).toBe('insufficient_basis');
    expect(customerOnly.judgment).not.toBe(before.judgment);
    const confirmed = confirmProblem(customerOnly);
    const next = selectNextAction(confirmed);
    assertReasonMatchesCitedPreview(next);
    expect(confirmed.stageId).toBe('S1');
    expect(confirmed.verdictId).toBe('judgment_deferred');
    expect(confirmed.judgment).toContain('고객 확인과 문제 확인을 반영했다');
    expect(confirmed.judgment).toContain(CUSTOMER_STATEMENT);
    expect(confirmed.judgment).toContain(PROBLEM_STATEMENT);
    expect(confirmed.judgment).toContain('CLAIM');
    expect(confirmed.whyPossible).toContain('h-customer');
    expect(confirmed.whyPossible).toContain('h-problem');
    expect(confirmed.whyFail).toContain('결제 기록은 없다');
    expect(next.hypothesisId).toBe('h-payer');
    expect(next.hypothesisId).not.toBe('h-channel');
    expect({
      beforeStage: before.stageId,
      afterStage: confirmed.stageId,
      beforeVerdict: before.verdictId,
      afterVerdict: confirmed.verdictId,
      beforeJudgment: before.judgment,
      afterJudgment: confirmed.judgment,
    }).toEqual({
      beforeStage: 'S0',
      afterStage: 'S1',
      beforeVerdict: 'insufficient_basis',
      afterVerdict: 'judgment_deferred',
      beforeJudgment: before.judgment,
      afterJudgment: confirmed.judgment,
    });

    const paidOnly = answer(seed, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    const paidNext = selectNextAction(paidOnly);
    const weak = paidOnly.bindings.find((item) => item.classReason === 'weak-payment');
    expect(paidOnly.stageId).toBe('S0');
    expect(paidOnly.verdictId).toBe('insufficient_basis');
    expect(paidOnly.stageId).not.toBe(confirmed.stageId);
    expect(paidOnly.verdictId).not.toBe(confirmed.verdictId);
    expect(paidOnly.judgment).toContain(WEAK_PAYMENT_SENTENCE);
    expect(paidOnly.judgment).toContain('주체·금액·기록이 없어 단계를 움직이지 않았다');
    expect(paidOnly.judgment).toContain('가정');
    expect(weak?.evidenceClass).toBe('CLAIM');
    expect(weak?.hypothesisId).toBe('h-business-model');
    expect(weak?.evidenceClass).not.toBe('FACT');
    expect(weak?.evidenceClass).not.toBe('VALIDATED');
    expect(paidNext.hypothesisId).toBe('h-customer');
    expect(paidNext.selectedId).toBe('q-customer');
    expect(paidNext.selectedId).not.toBe('q-payer');
    expect(paidNext.selectedId).not.toBe('v-business-model');
  });

  it('does not raise S2 or S3 when a payment claim arrives after S1', () => {
    const ready = confirmProblem();
    expect(ready.stageId).toBe('S1');
    expect(ready.verdictId).toBe('judgment_deferred');
    expect(ready.hypotheses['h-payer']?.evidenceClass).not.toBe('CLAIM');
    const paid = answer(ready, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    const next = selectNextAction(paid);
    assertReasonMatchesCitedPreview(next);
    const weak = paid.bindings.find((item) => item.classReason === 'weak-payment');
    expect(paid.stageId).toBe('S1');
    expect(paid.verdictId).toBe('judgment_deferred');
    expect(paid.stageId).not.toBe('S2');
    expect(paid.stageId).not.toBe('S3');
    expect(paid.verdictId).not.toBe('conditionally_viable');
    expect(paid.verdictId).not.toBe('viable');
    expect(paid.judgment).toContain(CUSTOMER_STATEMENT);
    expect(paid.judgment).toContain(PROBLEM_STATEMENT);
    expect(paid.judgment).toContain(WEAK_PAYMENT_SENTENCE);
    expect(paid.judgment).toContain('주체·금액·기록이 없어 단계를 움직이지 않았다');
    expect(weak?.evidenceClass).toBe('CLAIM');
    expect(next.hypothesisId).toBe('h-payer');
    expect(next.selectedId).toBe('q-payer');
    expect(next.prompt).toContain('누구의 결제');
    expect(next.prompt).toContain('금액과 거래 기록은 이 질문으로 생기지 않는다');
    const affirm = previewOf(next, 'q-payer', 'affirm');
    expect(affirm.judgmentChanged).toBe(true);
    expect(affirm.stageChanged).toBe(false);
  });

  it('matches the payer and absence reasons to the cited previews', () => {
    const problem = '메일·엑셀·ERP에 같은 숫자를 세 번 옮기다 오타가 난다';
    const customer = answer(
      createProjectLedger({
        customerStatement: '직원 20–80명 제조사 영업관리자',
        problemStatement: problem,
        businessStatement: '견적 자동화',
      }),
      { kind: 'affirm', targetHypothesisId: 'h-customer', proposition: '이 서비스를 가장 필요로 하는 사람은 직원 20–80명 제조사 영업관리자입니다.' },
    );
    expect(customer.stageId).toBe('S0');
    expect(customer.verdictId).toBe('insufficient_basis');
    const paid = answer(customer, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    const payerChoice = selectNextAction(paid);
    assertReasonMatchesCitedPreview(payerChoice);
    expect(payerChoice.selectedId).toBe('q-payer');
    expect(payerChoice.tieBreak).toBe('uncertainty-closed');
    expect(payerChoice.prompt).not.toContain(problem);
    expect(previewOf(payerChoice, 'q-payer', 'affirm').stageChanged).toBe(false);
    expect(previewOf(payerChoice, 'q-problem', 'affirm').stageChanged).toBe(true);
    expect(payerChoice.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(payerChoice.candidates.map((item) => item.id).length).toBeGreaterThan(1);

    const absent = answer(customer, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    const recordChoice = selectNextAction(absent);
    assertReasonMatchesCitedPreview(recordChoice);
    expect(recordChoice.selectedId).toBe('v-business-model');
    expect(recordChoice.prompt).not.toBe(payerChoice.prompt);
    expect(recordChoice.prompt).not.toContain(problem);
    expect(previewOf(recordChoice, 'v-business-model', 'literal_unreviewed').judgmentChangeClass).toBe('conflict');
    expect(previewOf(recordChoice, 'v-business-model', 'literal_unreviewed').stageChanged).toBe(false);
    expect(recordChoice.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(recordChoice.candidates.map((item) => item.id)).toEqual(expect.arrayContaining(['v-business-model', 'q-problem']));
  });

  it('keeps an unreviewed literal record off S3 and rejects a validated class', () => {
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../si-judgment-contract.ts'), 'utf8');
    expect(source).toContain("if (input.evidenceClass === 'VALIDATED') throw new Error('VALIDATED is not a binding class')");
    const customer = confirmCustomer();
    expect(customer.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    expect(customer.bindings.some((item) => item.evidenceClass === 'FACT' || item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(customer.bindings.find((item) => item.id === 'b-problem-doc')?.evidenceClass).toBe('ASSUMPTION');
    const absent = answer(customer, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    const conflicted = bindLiteralFact(absent, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' }).ledger;
    const fact = conflicted.bindings.find((item) => item.classReason === 'payment-literal');
    expect(conflicted.hypotheses['h-problem']?.evidenceClass).toBe('ASSUMPTION');
    expect(conflicted.hypotheses['h-market']?.evidenceClass).not.toBe('FACT');
    expect(conflicted.bindings.find((item) => item.classReason === 'absence')?.evidenceClass).toBe('CLAIM');
    expect(fact?.evidenceClass).toBe('FACT');
    expect(fact?.authenticityGuaranteed).toBe(false);
    expect(fact?.projectAttribution).toBe('unreviewed');
    expect(conflicted.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
    expect(conflicted.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(conflicted.stageId).not.toBe('S3');
    expect(conflicted.verdictId).not.toBe('conditionally_viable');
    expect(conflicted.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(closeReview(conflicted).reviewCompletion).not.toBe('closed_complete');

    const factOnly = bindLiteralFact(customer, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    expect(factOnly.ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(factOnly.ledger.stageId).not.toBe('S3');
    expect(factOnly.binding.projectAttribution).toBe('unreviewed');
  });

  it('does not reach S3 from unreviewed payment and metric facts', () => {
    const ready = defineCriterion(confirmPayer(), {
      hypothesisId: 'h-business-model',
      measure: '결제',
      passIf: '통과 조건',
      failIf: '실패 조건',
      requiredLiteralScopes: [],
    });
    const opened = answer(ready, { kind: 'unknown', targetHypothesisId: 'h-channel' });
    expect(opened.stageId).toBe('S2');
    expect(opened.verdictId).toBe('judgment_deferred');
    expect(opened.bindings.some((item) => item.evidenceClass === 'FACT')).toBe(false);
    const payment = bindLiteralFact(opened, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    const metric = bindLiteralFact(payment.ledger, { hypothesisId: 'h-business-model', recordText: '지표 한 줄', role: 'metric:pass' });
    expect(payment.binding.projectAttribution).toBe('unreviewed');
    expect(metric.binding.projectAttribution).toBe('unreviewed');
    expect(payment.binding.authenticityGuaranteed).toBe(false);
    expect(metric.binding.authenticityGuaranteed).toBe(false);
    expect(metric.ledger.stageId).toBe('S2');
    expect(metric.ledger.verdictId).toBe('judgment_deferred');
    expect(metric.ledger.stageId).not.toBe('S3');
    expect(metric.ledger.verdictId).not.toBe('conditionally_viable');
    expect(metric.ledger.verdictId).not.toBe('viable');
    expect(metric.ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(metric.ledger.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(closeReview(metric.ledger).reviewCompletion).not.toBe('closed_complete');
  });
});

describe('contract B cases A-D', () => {
  function criterionOn(ledger: JudgmentLedger): JudgmentLedger {
    return defineCriterion(ledger, {
      hypothesisId: 'h-business-model',
      measure: '결제',
      passIf: '통과 조건',
      failIf: '실패 조건',
      requiredLiteralScopes: [],
    });
  }

  it('keeps absence plus a literal fact unresolved instead of an insufficient record', () => {
    const absent = answer(confirmCustomer(), {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    expect(absent.stageId).toBe('S0');
    expect(absent.verdictId).toBe('insufficient_basis');
    expect(absent.hypotheses['h-business-model']?.outcome).toBe('not_run');
    const bound = bindLiteralFact(absent, {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    const ledger = bound.ledger;
    const absence = ledger.bindings.find((item) => item.classReason === 'absence');
    expect(ledger.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
    expect(ledger.hypotheses['h-business-model']?.outcome).not.toBe('insufficient_record');
    expect(ledger.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(ledger.hypotheses['h-business-model']?.outcome).not.toBe('failed');
    expect(ledger.hypotheses['h-business-model']?.evidenceClass).toBe('CONFLICT');
    expect(ledger.stageId).toBe('S0');
    expect(ledger.verdictId).toBe('insufficient_basis');
    expect(ledger.stageId).not.toBe('S3');
    expect(ledger.verdictId).not.toBe('conditionally_viable');
    expect(bound.binding.evidenceClass).toBe('FACT');
    expect(bound.binding.authenticityGuaranteed).toBe(false);
    expect(bound.binding.projectAttribution).toBe('unreviewed');
    expect(absence?.evidenceClass).toBe('CLAIM');
    expect(ledger.hypotheses['h-problem']?.evidenceClass).toBe('ASSUMPTION');
    expect(ledger.hypotheses['h-market']?.evidenceClass).not.toBe('FACT');
    expect(ledger.conflicts.some((item) => item.hypothesisId === 'h-business-model' && item.resolved === false)).toBe(true);
    expect(ledger.evidenceMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: absence?.id, text: ABSENCE_SENTENCE, evidenceClass: 'CLAIM' }),
        expect.objectContaining({ id: bound.binding.id, text: TAX_LINE, evidenceClass: 'FACT' }),
      ]),
    );
    expect(ledger.judgment).toContain('판단은 충돌이다');
    expect(ledger.judgment).toContain(`부재 근거 ${absence?.id}`);
    expect(ledger.judgment).toContain(`문자 근거 ${bound.binding.id}`);
    expect(ledger.judgment).toContain(ABSENCE_SENTENCE);
    expect(ledger.judgment).toContain(TAX_LINE);
    expect(ledger.judgment).toContain('귀속은 unreviewed');
    expect(ledger.judgment).toContain('검증된 사실이 아니고');
    expect(ledger.judgment).toContain('확정된 사업 성과가 아니다');
    expect(ledger.judgment).not.toContain('VALIDATED');
    expect(ledger.decisionChangingEvidence).toContain(absence?.id ?? '');
    expect(ledger.decisionChangingEvidence).toContain(bound.binding.id);
    const next = selectNextAction(ledger);
    expect(next.hypothesisId).toBe('h-problem');
    expect(next.selectedId).toBe('q-problem');
    expect(next.priorityReason).toContain('u-unconfirmed-h-problem');
    expect(next.priorityReason).toContain('선택 이유가 아니다');
    expect(next.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(previewOf(next, 'q-problem', 'affirm').stageBefore).toBe('S0');
    expect(previewOf(next, 'q-problem', 'affirm').stageAfter).toBe('S1');
    expect(closeReview(ledger).reviewCompletion).not.toBe('closed_complete');

    const resolved = resolveConflict(ledger, {
      hypothesisId: 'h-business-model',
      evidenceId: bound.binding.id,
      reason: '문자 기록을 작업 기준으로 둔다',
    });
    expect(resolved.bindings.map((item) => item.id)).toEqual(expect.arrayContaining(['b-absence', bound.binding.id]));
    expect(resolved.conflicts.some((item) => item.hypothesisId === 'h-business-model' && item.resolved === false)).toBe(false);
    expect(resolved.conflicts.some((item) => item.hypothesisId === 'h-business-model' && item.resolved === true)).toBe(true);
    expect(resolved.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(resolved.hypotheses['h-business-model']?.outcome).not.toBe('conflict_unresolved');
    expect(resolved.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(resolved.hypotheses['h-business-model']?.outcome).not.toBe('failed');
    expect(resolved.bindings.find((item) => item.id === bound.binding.id)?.projectAttribution).toBe('unreviewed');
    expect(resolved.stageId).toBe('S0');
    expect(resolved.verdictId).toBe('insufficient_basis');
    expect(resolved.stageId).not.toBe('S3');
    expect(closeReview(resolved).reviewCompletion).not.toBe('closed_complete');
    expect(resolved.judgment).toContain('충돌은 해소되었다');
    expect(resolved.judgment).toContain(bound.binding.id);
    expect(resolved.judgment).toContain(absence?.id ?? '');
    expect(resolved.judgment).toContain('귀속은 unreviewed');
    expect(resolved.judgment).toContain('확정된 사업 성과로 두지 않는다');
    expect(resolved.judgment).not.toContain('해소 전에는');
    expect(resolved.judgment).not.toContain('VALIDATED');
    expect(resolved.evidenceMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: absence?.id, evidenceClass: 'CLAIM' }),
        expect.objectContaining({ id: bound.binding.id, text: TAX_LINE, evidenceClass: 'FACT' }),
      ]),
    );
  });

  it('keeps the same conflict when the literal fact arrives before the absence claim', () => {
    const fact = bindLiteralFact(confirmCustomer(), {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    expect(fact.ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    const both = answer(fact.ledger, {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    expect(both.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
    expect(both.hypotheses['h-business-model']?.outcome).not.toBe('insufficient_record');
    expect(both.hypotheses['h-business-model']?.evidenceClass).toBe('CONFLICT');
    expect(both.bindings.find((item) => item.classReason === 'payment-literal')?.projectAttribution).toBe('unreviewed');
    expect(both.bindings.find((item) => item.classReason === 'absence')?.evidenceClass).toBe('CLAIM');
    expect(both.stageId).not.toBe('S3');
  });

  it('keeps a literal fact alone as an insufficient record at S0', () => {
    const bound = bindLiteralFact(confirmCustomer(), {
      hypothesisId: 'h-business-model',
      recordText: TAX_LINE,
      role: 'payment-literal',
    });
    const ledger = bound.ledger;
    expect(ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(ledger.hypotheses['h-business-model']?.outcome).not.toBe('conflict_unresolved');
    expect(ledger.hypotheses['h-business-model']?.evidenceClass).toBe('FACT');
    expect(ledger.stageId).toBe('S0');
    expect(ledger.verdictId).toBe('insufficient_basis');
    expect(ledger.stageId).not.toBe('S3');
    expect(bound.binding.projectAttribution).toBe('unreviewed');
    expect(bound.binding.authenticityGuaranteed).toBe(false);
    expect(ledger.bindings.some((item) => item.classReason === 'absence')).toBe(false);
    expect(ledger.conflicts.some((item) => item.hypothesisId === 'h-business-model')).toBe(false);
    const next = selectNextAction(ledger);
    expect(next.hypothesisId).toBe('h-problem');
    expect(next.selectedId).toBe('q-problem');
    expect(next.priorityReason).toContain('u-unconfirmed-h-problem');
    expect(next.priorityReason).toContain('선택 이유가 아니다');
    expect(next.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(previewOf(next, 'q-problem', 'affirm').stageBefore).toBe('S0');
    expect(previewOf(next, 'q-problem', 'affirm').stageAfter).toBe('S1');
    expect(closeReview(ledger).reviewCompletion).not.toBe('closed_complete');
  });

  it('keeps the stored stage when a criterion is written and moves it only on a later reevaluation', () => {
    const payer = confirmPayer();
    expect(payer.stageId).toBe('S1');
    expect(payer.verdictId).toBe('judgment_deferred');
    expect(payer.hypotheses['h-business-model']?.outcome).toBe('not_run');
    const written = criterionOn(payer);
    expect(written.stageId).toBe('S1');
    expect(written.stageId).toBe(payer.stageId);
    expect(written.verdictId).toBe('judgment_deferred');
    expect(written.verdictId).toBe(payer.verdictId);
    expect(written.reviewCompletion).toBe(payer.reviewCompletion);
    expect(written.hypotheses['h-business-model']?.outcome).toBe('not_run');
    expect(written.hypotheses['h-business-model']?.evidenceClass).toBe('ASSUMPTION');
    expect(written.bindings.some((item) => item.evidenceClass === 'FACT')).toBe(false);
    expect(written.criteria.find((item) => item.hypothesisId === 'h-business-model')?.passIf).toBe('통과 조건');
    expect(written.criteria.find((item) => item.hypothesisId === 'h-business-model')?.failIf).toBe('실패 조건');
    const preview = selectNextAction(written);
    expect(preview.hypothesisId).toBe('h-business-model');
    expect(preview.selectedId).toBe('v-business-model');
    expect(preview.priorityReason).toContain('u-model-record');
    expect(preview.priorityReason).toContain('선택 이유가 아니다');
    expect(preview.priorityReason).not.toMatch(/단계를 .+에서 .+로 바꾼다/);
    expect(previewOf(preview, 'v-business-model', 'absence_claim').stageChanged).toBe(true);
    expect(previewOf(preview, 'v-business-model', 'absence_claim').stageBefore).toBe('S1');
    expect(previewOf(preview, 'v-business-model', 'absence_claim').stageAfter).toBe('S2');
    expect(written.stageId).toBe('S1');

    const reevaluated = answer(written, { kind: 'unknown', targetHypothesisId: 'h-channel' });
    expect(reevaluated.stageId).toBe('S2');
    expect(reevaluated.stageId).not.toBe(written.stageId);
    expect(reevaluated.verdictId).toBe('judgment_deferred');
    expect(reevaluated.verdictId).not.toBe('conditionally_viable');
    expect(reevaluated.stageId).not.toBe('S3');
    expect(reevaluated.hypotheses['h-business-model']?.outcome).toBe('not_run');
    expect(reevaluated.hypotheses['h-business-model']?.evidenceClass).toBe('ASSUMPTION');
    expect(reevaluated.bindings.some((item) => item.evidenceClass === 'FACT')).toBe(false);
    expect(reevaluated.criticalUnknownHypothesisId).toBe('h-repeat');
    const next = selectNextAction(reevaluated);
    expect(next.candidates.map((item) => item.id)).toEqual(expect.arrayContaining(['q-repeat', 'v-business-model']));
    expect(next.hypothesisId).toBe('h-repeat');
    expect(next.selectedId).toBe('q-repeat');
    expect(next.tieBreak).toBe('uncertainty-closed');
    expect(next.priorityReason).toContain('affirm');
    expect(next.priorityReason).toContain('판단 문장이 달라진다');
    expect(next.priorityReason).toContain('단계 변화는 없다');
    expect(next.priorityReason).toContain('사업 성과를 확정하지 않는다');
    assertReasonMatchesCitedPreview(next);
    const compared = next.candidates.map((item) => {
      const previews = item.previews ?? [];
      return {
        id: item.id,
        alreadyKnown: item.alreadyKnown,
        judgmentChanged: previews.some((preview) => preview.judgmentChanged),
        failureDropsStage: previews.some((preview) => preview.failureDropsStage),
        critical: item.hypothesisId === reevaluated.criticalUnknownHypothesisId,
      };
    });
    expect(compared.find((item) => item.id === 'q-repeat')).toMatchObject({
      alreadyKnown: false,
      judgmentChanged: true,
      failureDropsStage: false,
      critical: true,
    });
    expect(compared.find((item) => item.id === 'v-business-model')?.judgmentChanged).toBe(true);
    expect(closeReview(reevaluated).reviewCompletion).not.toBe('closed_complete');
  });
});

const REASSESS_TRACE = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../../docs/evidence/ALABOM/AI-PM/PR197-CPO-SI-REASSESS-TRACE.json');
const PRESERVED_PROBLEM = '이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다. 새 고객에 대한 판정이 아니다.';

describe('section 10 reassess contracts', () => {
  it('states which roles enter stage, outcome, critical unknown, and candidates', () => {
    expect(HYPOTHESIS_ROLE_RULES).toEqual({
      active: { stage: true, outcome: true, critical: true, candidates: true },
      'conflict-side': { stage: true, outcome: true, critical: true, candidates: true },
      'inactive-preserved': { stage: false, outcome: false, critical: false, candidates: false },
    });
  });

  it('keeps the old problem out of evaluation and opens an empty unjudged problem', () => {
    const revised = replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.');
    const decision = selectNextAction(revised);
    expect(revised.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(revised.hypotheses['h-problem']?.role).toBe('inactive-preserved');
    expect(revised.bindings.some((item) => item.id === 'b-problem-doc' && item.proposition === PROBLEM_STATEMENT)).toBe(true);
    expect(revised.hypotheses['h-problem-next']?.statement).toBe('');
    expect(revised.hypotheses['h-problem-next']?.outcome).toBe('not_run');
    expect(revised.hypotheses['h-problem-next']?.evidenceClass).toBe('ASSUMPTION');
    expect(revised.hypotheses['h-problem-next']?.role).toBe('active');
    expect(revised.uncertainties[0]?.id).toBe('u-empty-problem');
    expect(revised.uncertainties.map((item) => item.id)).toContain('u-conflict-h-customer');
    expect(decision.selectedId).toBe('q-problem-next');
    expect(decision.candidates.some((item) => item.hypothesisId === 'h-problem')).toBe(false);
    expect(decision.prompt).not.toContain(PROBLEM_STATEMENT);
    expect(revised.judgment).toContain(PRESERVED_PROBLEM);
    expect(revised.stageId).toBe('S0');
    expect(revised.hypotheses['h-customer']?.evidenceClass).not.toBe('FACT');
    expect(revised.hypotheses['h-customer-next']?.evidenceClass).toBe('CLAIM');
  });

  it('leaves the customer conflict active until resolve, then refuses passed and VALIDATED', () => {
    const revised = replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.');
    const filled = answer(revised, {
      kind: 'affirm',
      targetHypothesisId: 'h-problem-next',
      proposition: '배차 기준이 현장에 없다',
    });
    expect(filled.uncertainties[0]?.id).toBe('u-conflict-h-customer');
    expect(filled.hypotheses['h-problem']?.role).toBe('inactive-preserved');
    expect(filled.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    const beforeResolve = selectNextAction(filled);
    expect(beforeResolve.selectedId).toBe('q-resolve-h-customer');
    const conflict = filled.conflicts.find((item) => item.hypothesisId === 'h-customer' && !item.resolved);
    if (!conflict) throw new Error('customer conflict missing');
    const resolved = resolveConflict(filled, {
      hypothesisId: 'h-customer',
      evidenceId: conflict.rightId,
      reason: '새 고객을 작업 기준으로 둔다',
    });
    expect(resolved.conflicts.some((item) => item.hypothesisId === 'h-customer' && !item.resolved)).toBe(false);
    expect(resolved.hypotheses['h-customer']?.outcome).toBe('not_run');
    expect(resolved.hypotheses['h-customer']?.outcome).not.toBe('passed');
    expect(resolved.bindings.find((item) => item.id === conflict.rightId)?.projectAttribution).toBe('unreviewed');
    expect(resolved.bindings.find((item) => item.id === conflict.rightId)?.authenticityGuaranteed).toBe(false);
    expect(resolved.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(resolved.bindings.some((item) => item.id === conflict.leftId)).toBe(true);
    expect(resolved.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(resolved.hypotheses['h-problem']?.role).toBe('inactive-preserved');

    const absent = answer(confirmCustomer(), {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    const bound = bindLiteralFact(absent, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    const model = resolveConflict(bound.ledger, {
      hypothesisId: 'h-business-model',
      evidenceId: bound.binding.id,
      reason: '문자 기록을 작업 기준으로 둔다',
    });
    expect(model.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(model.hypotheses['h-business-model']?.outcome).not.toBe('passed');
    expect(model.bindings.find((item) => item.id === bound.binding.id)?.projectAttribution).toBe('unreviewed');
    expect(model.bindings.find((item) => item.id === bound.binding.id)?.authenticityGuaranteed).toBe(false);
    expect(model.bindings.some((item) => item.id === 'b-absence')).toBe(true);
    expect(model.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(model.judgment).not.toContain('VALIDATED');
  });

  it('does not let decision_ready create or execute a validation plan', () => {
    const ready = confirmProblem();
    expect(ready.reviewCompletion).toBe('decision_ready');
    expect(ready.validationPlan.status).toBe('not_required');
    expect(ready.validationPriority.length).toBeGreaterThan(0);
    const absent = answer(ready, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    expect(absent.reviewCompletion).toBe('decision_ready');
    expect(absent.validationPlan.status).toBe('proposed');
    expect(absent.validationPlan.targetHypothesisId).toBe('h-business-model');
    expect(absent.validationPlan.evidenceNeeded).toContain('주체와 금액이 적힌 문자 기록');
    expect(absent.validationPlan.passIf.length).toBeGreaterThan(0);
    expect(absent.validationPlan.failIf.length).toBeGreaterThan(0);
    expect(absent.validationPlan.pendingWork).toContain('설정하지 않는다');
    expect(absent.validationPlan.status).not.toBe('executed');
    const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../si-judgment-contract.ts'), 'utf8');
    expect(source).not.toMatch(/status:\s*'executed'/);
  });

  it('does not close the critical uncertainty when only the sentence changes', () => {
    const ready = confirmProblem();
    const decision = selectNextAction(ready);
    expect(ready.uncertainties[0]?.id).toBe('u-payer');
    const unknown = previewOf(decision, 'q-payer', 'unknown');
    expect(unknown.judgmentChanged).toBe(true);
    expect(unknown.closedUncertaintyIds ?? []).not.toContain('u-payer');
    expect(unknown.uncertaintyIdsAfter ?? []).toContain('u-payer');
  });

  it('prefers the candidate that closes the critical uncertainty', () => {
    const conflicted = answer(replaceCustomer(confirmProblem(), '우리 고객은 물류본부다.'), {
      kind: 'affirm',
      targetHypothesisId: 'h-problem-next',
      proposition: '배차 기준이 현장에 없다',
    });
    const resolveChoice = selectNextAction(conflicted);
    expect(conflicted.uncertainties[0]?.id).toBe('u-conflict-h-customer');
    expect(resolveChoice.selectedId).toBe('q-resolve-h-customer');
    expect(resolveChoice.priorityReason).toContain('q-payer는 u-conflict-h-customer를 남긴다');
    const payerClosed = previewOf(resolveChoice, 'q-payer', 'affirm').closedUncertaintyIds ?? [];
    const resolveClosed = previewOf(resolveChoice, 'q-resolve-h-customer', 'resolve_retain_new').closedUncertaintyIds ?? [];
    expect(payerClosed).not.toContain('u-conflict-h-customer');
    expect(resolveClosed).toContain('u-conflict-h-customer');

    const payerOnly = answer(confirmCustomer(), {
      kind: 'payment_claim',
      proposition: WEAK_PAYMENT_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    const payerChoice = selectNextAction(payerOnly);
    expect(payerOnly.uncertainties[0]?.id).toBe('u-payer');
    expect(payerOnly.conflicts.some((item) => item.hypothesisId === 'h-customer' && !item.resolved)).toBe(false);
    expect(payerChoice.selectedId).toBe('q-payer');
    expect(previewOf(payerChoice, 'q-payer', 'affirm').closedUncertaintyIds ?? []).toContain('u-payer');

    const recordOnly = answer(confirmCustomer(), {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    const recordChoice = selectNextAction(recordOnly);
    expect(recordOnly.uncertainties[0]?.id).toBe('u-record');
    expect(recordChoice.selectedId).toBe('v-business-model');
    expect(previewOf(recordChoice, 'v-business-model', 'literal_unreviewed').closedUncertaintyIds ?? []).toContain('u-record');
    expect(previewOf(recordChoice, 'q-payer', 'affirm').closedUncertaintyIds ?? []).not.toContain('u-record');
    expect(recordChoice.priorityReason).toContain('필요한 증거는 주체와 금액이 적힌 문자 기록');
  });

  it('proposes evidence collection when no candidate closes the critical uncertainty', () => {
    const written = defineCriterion(confirmPayer(), {
      hypothesisId: 'h-business-model',
      measure: '결제',
      passIf: '귀속된 결제와 반복 사용이 있다',
      failIf: '결제 기록이 이 사업의 거래로 확인되지 않는다',
      requiredLiteralScopes: [],
    });
    const bound = bindLiteralFact(written, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    expect(bound.ledger.uncertainties[0]?.id).toBe('u-attribution');
    expect(bound.binding.projectAttribution).toBe('unreviewed');
    const decision = selectNextAction(bound.ledger);
    expect(decision.selectedId).toBe('v-record-needed');
    expect(decision.priorityReason).toContain('u-attribution');
    expect(decision.priorityReason).toContain('닫지 못한다');
    expect(bound.ledger.validationPlan.status).toBe('proposed');
    expect(bound.ledger.validationPlan.status).not.toBe('executed');
    expect(bound.ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(bound.ledger.hypotheses['h-business-model']?.outcome).not.toBe('passed');
  });

  it('returns the same decision for the same ledger', () => {
    const ready = confirmProblem();
    expect(selectNextAction(ready)).toEqual(selectNextAction(ready));
    const revised = replaceCustomer(ready, '우리 고객은 물류본부다.');
    const first = selectNextAction(revised);
    const second = selectNextAction(revised);
    expect(second.selectedId).toBe(first.selectedId);
    expect(second.priorityReason).toBe(first.priorityReason);
    expect(second.tieBreak).toBe(first.tieBreak);
  });

  it('walks one founder journey without promoting a claim or a literal record', () => {
    const rows: Array<Record<string, string>> = [];
    let ledger = createSeedLedger();
    const snap = (step: string, expected: string) => {
      const decision = selectNextAction(ledger);
      const actual = decision.selectedId;
      const failure = actual === expected ? '' : `expected ${expected} actual ${actual}`;
      rows.push({
        step,
        input: step,
        expected,
        actual,
        critical: ledger.uncertainties[0]?.id ?? '',
        plan: ledger.validationPlan.status,
        stage: ledger.stageId,
        modelOutcome: ledger.hypotheses['h-business-model']?.outcome ?? '',
        failure,
      });
      expect(failure, JSON.stringify(rows.at(-1))).toBe('');
      expect(ledger.validationPlan.status).not.toBe('executed');
      return decision;
    };

    snap('0 seed', 'q-customer');
    ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-customer', proposition: CUSTOMER_CONFIRM });
    expect(ledger.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    snap('1 confirm customer', 'q-problem');
    ledger = answer(ledger, { kind: 'replace', targetHypothesisId: 'h-customer', nextStatement: '우리 고객은 대기업 물류본부다.' });
    expect(ledger.hypotheses['h-problem']?.role).toBe('inactive-preserved');
    expect(ledger.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    expect(ledger.judgment).toContain(PRESERVED_PROBLEM);
    const replaced = snap('2 replace customer', 'q-problem-next');
    expect(replaced.prompt).not.toContain(PROBLEM_STATEMENT);
    ledger = applyFounderAnswer(ledger, replaced, { kind: 'unknown', targetHypothesisId: 'h-problem-next' }).ledger;
    expect(ledger.hypotheses['h-problem-next']?.statement).toBe('');
    expect(ledger.hypotheses['h-problem-next']?.outcome).toBe('not_run');
    snap('3 unknown new problem', 'q-problem-next');
    ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-problem-next', proposition: '배차 기준이 현장에 없다' });
    const resolving = snap('4 affirm new problem', 'q-resolve-h-customer');
    expect(resolving.priorityReason).toContain('q-payer는 u-conflict-h-customer를 남긴다');
    expect(previewOf(resolving, 'q-payer', 'affirm').closedUncertaintyIds ?? []).not.toContain('u-conflict-h-customer');
    ledger = answer(ledger, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    snap('5 weak payment', 'q-resolve-h-customer');
    ledger = answer(ledger, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    expect(ledger.validationPlan.status).toBe('proposed');
    snap('6 absence', 'q-resolve-h-customer');
    const fact = bindLiteralFact(ledger, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    ledger = fact.ledger;
    expect(ledger.hypotheses['h-business-model']?.outcome).toBe('conflict_unresolved');
    snap('7 literal fact', 'q-resolve-h-customer');
    ledger = resolveConflict(ledger, {
      hypothesisId: 'h-business-model',
      evidenceId: fact.binding.id,
      reason: '문자 기록을 작업 기준으로 둔다',
    });
    expect(ledger.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(ledger.bindings.find((item) => item.id === fact.binding.id)?.projectAttribution).toBe('unreviewed');
    expect(ledger.stageId).toBe('S0');
    expect(ledger.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');
    snap('8 resolve literal', 'q-resolve-h-customer');
    ledger = defineCriterion(ledger, {
      hypothesisId: 'h-business-model',
      measure: '결제',
      passIf: '귀속된 결제와 반복 사용이 있다',
      failIf: '결제 기록이 이 사업의 거래로 확인되지 않는다',
      requiredLiteralScopes: [],
    });
    expect(ledger.stageId).toBe('S0');
    snap('9 criterion', 'q-resolve-h-customer');
    const off = selectNextAction(ledger);
    expect(off.hypothesisId).not.toBe('h-channel');
    ledger = applyFounderAnswer(ledger, off, { kind: 'unknown', targetHypothesisId: 'h-channel' }).ledger;
    snap('10 off-selection unknown', 'q-resolve-h-customer');
    expect(ledger.validationPlan.status).toBe('proposed');
    expect(ledger.validationPlan.evidenceNeeded.length).toBeGreaterThan(0);
    expect(ledger.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    writeFileSync(REASSESS_TRACE, JSON.stringify({ rows }, null, 2));
  });
});
