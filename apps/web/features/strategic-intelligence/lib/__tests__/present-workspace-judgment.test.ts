import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { FounderAnswerAct } from '@repo/types/domain/strategic-intelligence';
import { describe, expect, it } from 'vitest';

import { applyClassifiedFounderEvent, classifyFounderText, commitFounderText } from '../classify-founder-event';
import {
  presentWorkspaceJudgment,
  stripWorkspaceJudgmentTokens,
  visibleWorkspaceJudgmentSentences,
  workspaceJudgmentExposesInternalToken,
  type WorkspaceJudgmentView,
} from '../present-workspace-judgment';
import {
  ABSENCE_SENTENCE,
  CUSTOMER_CONFIRM,
  CUSTOMER_STATEMENT,
  PAYER_CONFIRM,
  PROBLEM_STATEMENT,
  WEAK_PAYMENT_SENTENCE,
  applyFounderAnswer,
  bindLiteralFact,
  createProjectLedger,
  createSeedLedger,
  defineCriterion,
  resolveConflict,
  selectNextAction,
  type JudgmentLedger,
} from '../si-judgment-contract';

const TAX_LINE = '2026-03-02 반찬가게 A, 3만 원, 1회';
const HERE = dirname(fileURLToPath(import.meta.url));
const RUN_PATH = resolve(HERE, '../../../../../../docs/evidence/ALABOM/AI-PM/PR197-CPO-SI-UI-INTEGRATION-RUN.json');

function answer(ledger: JudgmentLedger, act: FounderAnswerAct): JudgmentLedger {
  return applyFounderAnswer(ledger, selectNextAction(ledger), act).ledger;
}

function viewOf(ledger: JudgmentLedger, previous?: WorkspaceJudgmentView | null) {
  const decision = selectNextAction(ledger);
  const view = presentWorkspaceJudgment({ ledger, decision, previous });
  if (!view) throw new Error('view missing');
  return { decision, view };
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

describe('workspace judgment view', () => {
  it('keeps the ledger meaning and takes the next action from the decision prompt', () => {
    const replaced = answer(confirmCustomer(), {
      kind: 'replace',
      targetHypothesisId: 'h-customer',
      nextStatement: '대기업 물류본부',
      proposition: '대기업 물류본부',
    });
    const { decision, view } = viewOf(replaced);
    expect(view.judgmentText).toContain('대기업 물류본부');
    expect(view.judgmentText).toContain(PROBLEM_STATEMENT);
    expect(view.judgmentText).toContain('활성 평가에서 제외');
    expect(view.judgmentText).toContain('CLAIM');
    expect(view.nextActionText).toBe(stripWorkspaceJudgmentTokens(decision.prompt));
    expect(view.nextActionText).toContain('대기업 물류본부');
    expect(workspaceJudgmentExposesInternalToken(view)).toBe(false);
    expect(Object.keys(view).sort()).toEqual([
      'judgmentText',
      'nextActionText',
      'reviewCompletion',
      'validationPlanStatus',
      'validationPlanText',
    ]);
  });

  it('shows a question and a proposed plan as separate sentences', () => {
    let ledger = createSeedLedger();
    ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-customer', proposition: CUSTOMER_CONFIRM });
    ledger = answer(ledger, { kind: 'replace', targetHypothesisId: 'h-customer', nextStatement: '우리 고객은 대기업 물류본부다.' });
    ledger = answer(ledger, { kind: 'unknown', targetHypothesisId: 'h-problem-next' });
    ledger = answer(ledger, { kind: 'affirm', targetHypothesisId: 'h-problem-next', proposition: '배차 기준이 현장에 없다' });
    ledger = answer(ledger, { kind: 'payment_claim', proposition: WEAK_PAYMENT_SENTENCE, targetHypothesisId: 'h-business-model' });
    ledger = answer(ledger, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' });
    const fact = bindLiteralFact(ledger, { hypothesisId: 'h-business-model', recordText: TAX_LINE, role: 'payment-literal' });
    const resolved = resolveConflict(fact.ledger, {
      hypothesisId: 'h-business-model',
      evidenceId: fact.binding.id,
      reason: '문자 기록을 작업 기준으로 둔다',
    });
    const { decision, view } = viewOf(resolved);
    const selected = decision.candidates.find((item) => item.id === decision.selectedId);
    expect(resolved.uncertainties[0]?.resolvableByQuestion).toBe(true);
    expect(resolved.uncertainties.some((item, index) => index > 0 && !item.resolvableByQuestion)).toBe(true);
    expect(selected?.actionKind).toBe('question');
    expect(view.validationPlanStatus).toBe('proposed');
    expect(view.validationPlanText).toContain(resolved.validationPlan.evidenceNeeded);
    expect(view.validationPlanText).toContain(resolved.validationPlan.pendingWork);
    expect(view.nextActionText).toContain('어느 근거를');
    expect(visibleWorkspaceJudgmentSentences(view)).toHaveLength(3);
    expect(resolved.hypotheses['h-business-model']?.outcome).toBe('insufficient_record');
    expect(fact.binding.projectAttribution).toBe('unreviewed');
    expect(workspaceJudgmentExposesInternalToken(view)).toBe(false);
  });

  it('does not call not_required or decision_ready validation complete', () => {
    const ready = confirmProblem();
    const { view } = viewOf(ready);
    expect(view.validationPlanStatus).toBe('not_required');
    expect(view.validationPlanText).toBe('');
    expect(view.reviewCompletion).toBe('decision_ready');
    const visible = visibleWorkspaceJudgmentSentences(view).join('\n');
    expect(visible).not.toContain('검증 완료');
    expect(visible).not.toContain('검증이 필요 없');
    expect(visibleWorkspaceJudgmentSentences(view)).toHaveLength(2);
  });

  it('keeps stage, verdict, and review completion across defineCriterion', () => {
    const before = confirmPayer();
    const written = defineCriterion(before, {
      hypothesisId: 'h-business-model',
      measure: '기준',
      passIf: '통과 조건',
      failIf: '실패 조건',
      requiredLiteralScopes: [],
    });
    expect(written.stageId).toBe(before.stageId);
    expect(written.verdictId).toBe(before.verdictId);
    expect(written.reviewCompletion).toBe(before.reviewCompletion);
    const { view } = viewOf(written);
    const visible = visibleWorkspaceJudgmentSentences(view).join('\n');
    expect(visible).not.toMatch(/단계가 바뀌|단계가 올랐|S1→S2/);
    expect(workspaceJudgmentExposesInternalToken(view)).toBe(false);
  });

  it('keeps the previous view when the plan status is executed', () => {
    const ledger = createSeedLedger();
    const { decision, view } = viewOf(ledger);
    const executed = {
      ...ledger,
      validationPlan: { ...ledger.validationPlan, status: 'executed' as const },
    };
    expect(presentWorkspaceJudgment({ ledger: executed, decision, previous: view })).toBe(view);
    expect(presentWorkspaceJudgment({ ledger: executed, decision, previous: null })).toBeNull();
  });

  it('prints scenario A uncertainties, E selected action, and D prompt text from the engine', () => {
    const replaced = answer(confirmCustomer(), {
      kind: 'replace',
      targetHypothesisId: 'h-customer',
      nextStatement: '대기업 물류본부',
      proposition: '대기업 물류본부',
    });
    const scenarioA = viewOf(replaced);
    const ready = confirmProblem();
    const absent = answer(ready, {
      kind: 'absence_claim',
      proposition: ABSENCE_SENTENCE,
      targetHypothesisId: 'h-business-model',
    });
    const scenarioE = viewOf(absent);
    const first = selectNextAction(ready);
    const afterUnknown = answer(ready, { kind: 'unknown', targetHypothesisId: first.hypothesisId });
    const second = selectNextAction(afterUnknown);
    const beforeView = presentWorkspaceJudgment({ ledger: ready, decision: first, previous: null });
    const afterView = presentWorkspaceJudgment({ ledger: afterUnknown, decision: second, previous: beforeView });
    expect(beforeView?.nextActionText).toBe(first.prompt);
    expect(afterView?.nextActionText).not.toBe(beforeView?.nextActionText);
    expect(afterView?.nextActionText).toBe(second.prompt);
    expect(afterUnknown.hypotheses[first.hypothesisId]?.evidenceClass).toBe(ready.hypotheses[first.hypothesisId]?.evidenceClass);
    expect(absent.validationPlan.status).toBe('proposed');
    expect(absent.uncertainties.some((item) => item.id === 'u-record' && !item.resolvableByQuestion)).toBe(true);
    expect(replaced.uncertainties.every((item) => item.resolvableByQuestion)).toBe(true);
    expect(replaced.validationPlan.status).toBe('not_required');
    expect(scenarioA.view.validationPlanText).toBe('');
    expect(scenarioE.view.validationPlanStatus).toBe('proposed');
    expect(scenarioE.view.nextActionText).toBe(stripWorkspaceJudgmentTokens(scenarioE.decision.prompt));
    const record = {
      scenarioA: {
        uncertaintyIds: replaced.uncertainties.map((item) => item.id),
        resolvableByQuestion: replaced.uncertainties.map((item) => item.resolvableByQuestion),
        planStatus: replaced.validationPlan.status,
        selectedId: scenarioA.decision.selectedId,
        prompt: scenarioA.decision.prompt,
      },
      scenarioE: {
        uncertaintyIds: absent.uncertainties.map((item) => item.id),
        resolvableByQuestion: absent.uncertainties.map((item) => item.resolvableByQuestion),
        planStatus: absent.validationPlan.status,
        selectedId: scenarioE.decision.selectedId,
        prompt: scenarioE.decision.prompt,
        evidenceNeeded: absent.validationPlan.evidenceNeeded,
      },
      scenarioD: {
        beforePrompt: first.prompt,
        afterPrompt: second.prompt,
        beforeSelectedId: first.selectedId,
        afterSelectedId: second.selectedId,
        hypothesisId: first.hypothesisId,
      },
    };
    writeFileSync(RUN_PATH, JSON.stringify(record, null, 2));
    expect(record.scenarioA).toEqual({
      uncertaintyIds: ['u-empty-problem', 'u-conflict-h-customer'],
      resolvableByQuestion: [true, true],
      planStatus: 'not_required',
      selectedId: 'q-problem-next',
      prompt: '새 고객과 문제의 짝이 비어 있다. 대기업 물류본부 고객이 겪는 불편은 무엇입니까?',
    });
    expect(record.scenarioE.selectedId).toBe('v-business-model');
    expect(record.scenarioE.uncertaintyIds).toEqual(['u-record', 'u-payer']);
    expect(record.scenarioE.prompt).toBe(
      '부재는 결제 가설의 CLAIM이다. 문제 문장을 다시 확인해도 기록이 생기지 않는다. 주체와 금액이 적힌 문자 기록이 있어야 부재와 구분된다.',
    );
    expect(record.scenarioD.beforePrompt).toBe('누가 비용을 지불하는지 확인해 달라.');
    expect(record.scenarioD.afterPrompt).toBe(
      '누가 비용을 지불하는지 확인해 달라. 더 좁혀 근거가 될 기록의 범위를 지정해 달라.',
    );
    expect(record.scenarioD.beforeSelectedId).toBe('q-payer');
    expect(record.scenarioD.afterSelectedId).toBe('q-payer');
  });
});

describe('founder event adapter', () => {
  it('keeps the previous judgment and prompt when the text is unclassified', () => {
    const ledger = createSeedLedger();
    const decision = selectNextAction(ledger);
    const view = presentWorkspaceJudgment({ ledger, decision, previous: null });
    expect(view).not.toBeNull();
    const next = commitFounderText(ledger, decision, '안녕하세요 오늘 날씨가 좋네요', view);
    expect(next.applied).toBe(false);
    expect(next.ledger).toBe(ledger);
    expect(next.decision).toBe(decision);
    expect(next.view.judgmentText).toBe(view?.judgmentText);
    expect(next.view.nextActionText).toBe(view?.nextActionText);
  });

  it('stores the first problem sentence on the empty problem the engine asked', () => {
    const ledger = createProjectLedger({
      customerStatement: '',
      problemStatement: '',
      businessStatement: '월 구독',
    });
    const decision = selectNextAction(ledger);
    const applied = applyClassifiedFounderEvent(
      ledger,
      decision,
      classifyFounderText('배차 기준이 현장에 없다', ledger, decision),
    );
    expect(applied.applied).toBe(true);
    expect(applied.ledger.hypotheses['h-problem']?.statement).toBe('배차 기준이 현장에 없다');
    expect(applied.ledger.hypotheses['h-problem']?.evidenceClass).toBe('CLAIM');
    expect(applied.ledger.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(applied.ledger.bindings.some((item) => item.evidenceClass === 'FACT')).toBe(false);
  });

  it('does not promote a founder sentence or a literal record to VALIDATED', () => {
    const ledger = createSeedLedger();
    const decision = selectNextAction(ledger);
    const confirmed = applyClassifiedFounderEvent(ledger, decision, classifyFounderText('맞습니다', ledger, decision));
    expect(confirmed.applied).toBe(true);
    expect(confirmed.ledger.hypotheses['h-customer']?.evidenceClass).toBe('CLAIM');
    expect(confirmed.ledger.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    const recorded = applyClassifiedFounderEvent(
      confirmed.ledger,
      confirmed.decision,
      classifyFounderText(TAX_LINE, confirmed.ledger, confirmed.decision),
    );
    const fact = recorded.ledger.bindings.find((item) => item.classReason === 'payment-literal');
    expect(fact?.evidenceClass).toBe('FACT');
    expect(fact?.projectAttribution).toBe('unreviewed');
    expect(fact?.authenticityGuaranteed).toBe(false);
    expect(recorded.ledger.bindings.some((item) => item.evidenceClass === 'VALIDATED')).toBe(false);
    expect(classifyFounderText('변경:', ledger, decision).type).toBe('refused');
    expect(classifyFounderText('통과: 있다', ledger, decision).type).toBe('refused');
  });
});

describe('screen source owns one judgment and one next action', () => {
  it('does not let the presenter or the adapter call the document analyzer', () => {
    const presenter = readFileSync(resolve(HERE, '../present-workspace-judgment.ts'), 'utf8');
    const adapter = readFileSync(resolve(HERE, '../classify-founder-event.ts'), 'utf8');
    for (const source of [presenter, adapter]) {
      expect(source).not.toContain('analyzeStrategicIntelligence');
      expect(source).not.toContain('decideSiValidationAsk');
      expect(source).not.toContain('resolveNextQuestionDecision');
      expect(source).not.toContain('closeReview');
    }
  });

  it('renders the ledger sentences once and does not overlay siValidationAsk', () => {
    const main = readFileSync(
      resolve(HERE, '../../../workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx'),
      'utf8',
    );
    const loop = readFileSync(
      resolve(HERE, '../../../workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx'),
      'utf8',
    );
    expect(main.match(/data-testid="workspace-judgment-text"/g)).toHaveLength(1);
    expect(main.match(/data-testid="workspace-next-action"/g)).toHaveLength(1);
    expect(main).not.toContain('resolveSiJourneyIntegration');
    expect(main).not.toContain('SiReviewSurface');
    expect(main).not.toContain('siJudgment && !isPostReview');
    expect(main.match(/\{ledgerBlock\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(loop).not.toContain('siValidationAsk.questionText');
    expect(loop).not.toContain('data-testid="workspace-judgment-text"');
    expect(loop).not.toContain('data-testid="workspace-next-action"');
    expect(main).toContain('onLedgerAnswer={ledgerSession ? submitLedgerAnswer : undefined}');
  });
});
