import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { DecisionBranch, DecisionCandidate } from '@repo/types/domain/strategic-intelligence';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ABSENCE_SENTENCE,
  CUSTOMER_CONFIRM,
  CUSTOMER_STATEMENT,
  LOGISTICS_PROBLEM_ID,
  LOGISTICS_PROMPT,
  PAYER_CONFIRM,
  PROBLEM_STATEMENT,
  WEAK_PAYMENT_SENTENCE,
  applyBudgetHold,
  bindLiteralFact,
  closeReview,
  commitFounderStatement,
  createSeedLedger,
  defineCriterion,
  judgeAttribution,
  judgeRequiredHypothesis,
  offerModelDraft,
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

function confirmCustomer(ledger: JudgmentLedger = createSeedLedger()): JudgmentLedger {
  return commitFounderStatement(ledger, { proposition: CUSTOMER_CONFIRM });
}

function confirmProblem(ledger: JudgmentLedger = confirmCustomer()): JudgmentLedger {
  return commitFounderStatement(ledger, { proposition: '주문과 배송을 따로 관리해야 하는 문제가 맞습니다.' });
}

function confirmPayer(ledger: JudgmentLedger = confirmProblem()): JudgmentLedger {
  return commitFounderStatement(ledger, { proposition: PAYER_CONFIRM });
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
    expect(second.eliminated.map((item) => item.hypothesisId)).toEqual(expect.arrayContaining(['h-payer', 'h-channel']));

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

describe('AT-04 revised customer selects the new problem', () => {
  it('asks about the logistics customer problem and drops the old problem as already known', () => {
    const revised = commitFounderStatement(confirmProblem(), { proposition: '우리 고객은 물류본부다.' });
    expect(revised.stageId).toBe('S0');
    expect(revised.verdictId).toBe('insufficient_basis');
    expect(revised.whyPossible).toContain('철회');
    expect(revised.hypotheses['h-customer']?.outcome).toBe('conflict_unresolved');

    const decision = selectNextAction(revised);
    const choice = selected(decision);
    expect(choice.hypothesisId).toBe(LOGISTICS_PROBLEM_ID);
    expect(choice.hypothesisId).not.toBe('h-problem');
    expect(choice.prompt).toBe(LOGISTICS_PROMPT);
    expect(choice.prompt).toContain('물류본부');
    expect(choice.prompt).toContain('불편');
    expect(choice.prompt).not.toContain(PROBLEM_STATEMENT);
    expect(decision.eliminated).toEqual(
      expect.arrayContaining([expect.objectContaining({ hypothesisId: 'h-problem', key: 'alreadyKnown' })]),
    );
  });
});

describe('AT-05 old problem confirmation stays on the new pair', () => {
  it('does not retarget the next action when the old problem sentence is repeated', () => {
    const revised = commitFounderStatement(confirmProblem(), { proposition: '우리 고객은 물류본부다.' });
    const before = selectNextAction(revised);
    const answered = commitFounderStatement(revised, { proposition: PROBLEM_STATEMENT });
    expect(answered.hypotheses['h-problem']?.statement).toBe(PROBLEM_STATEMENT);
    const after = selectNextAction(answered);
    expect(selected(after).hypothesisId).toBe(LOGISTICS_PROBLEM_ID);
    expect(selected(after).hypothesisId).not.toBe('h-problem');
    expect(after.priorityReason).toBe(before.priorityReason);
    expect(after.priorityReason).toContain('짝이 비어');
    expect(after.priorityReason).not.toContain(FORBIDDEN_PROBLEM_CHANGED);
    expect(narrative(answered)).not.toContain(FORBIDDEN_PROBLEM_CHANGED);
  });
});

describe('AT-06 absence is not a fact on other hypotheses', () => {
  it('stores an absence claim only on the payment hypothesis', () => {
    const before = confirmProblem();
    const next = commitFounderStatement(before, { proposition: ABSENCE_SENTENCE });
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
    const next = commitFounderStatement(before, { proposition: WEAK_PAYMENT_SENTENCE });
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
          ? bindLiteralFact(commitFounderStatement(start, { proposition: ABSENCE_SENTENCE }), {
              hypothesisId: 'h-business-model',
              recordText: TAX_LINE,
              role: 'payment-literal',
            }).ledger
          : commitFounderStatement(
              bindLiteralFact(start, {
                hypothesisId: 'h-business-model',
                recordText: TAX_LINE,
                role: 'payment-literal',
              }).ledger,
              { proposition: ABSENCE_SENTENCE },
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
    const answered = commitFounderStatement(ready, { proposition: '모르겠음' });
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
    commitFounderStatement(problem, { proposition: '우리 고객은 물류본부다.' });
    commitFounderStatement(problem, { proposition: ABSENCE_SENTENCE });
    commitFounderStatement(problem, { proposition: WEAK_PAYMENT_SENTENCE });
    bindLiteralFact(problem, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    selectNextAction(problem);
    commitFounderStatement(problem, { proposition: '모르겠음' });
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
