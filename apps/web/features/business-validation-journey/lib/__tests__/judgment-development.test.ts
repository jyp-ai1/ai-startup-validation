import { describe, expect, it } from 'vitest';

import { acceptPastedAnalysis } from '../external-handoff';
import { applyAnswer, correctField, startJourney } from '../journey-engine';
import { recordExternalAnalysis } from '../judgment-development';
import { JUDGMENT_TEXT, type Intake } from '../journey-types';

const NOW = '2026-10-15T09:00:00.000Z';
const LATER = '2026-10-15T09:10:00.000Z';
const AFTER = '2026-10-15T09:20:00.000Z';

const INTAKE: Intake = {
  business: '기업 물류본부의 주문과 배송 누락을 줄이는 서비스',
  customer: '기업 물류본부',
  problem: '주문 정보와 배송 정보가 분리되어 누락이 발생한다',
  solution: '주문과 배송을 한 화면에서 대조한다',
  payer: '',
  revenue: '',
  evidence: '',
  url: '',
};

function started() {
  const result = startJourney(INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

describe('judgment development scenarios', () => {
  it('separates a user declaration from a live success', () => {
    const declared = recordExternalAnalysis(started(), {
      executionId: 'declared-1',
      text: '주문과 배송이 나뉘어 누락이 발생한다.',
      provenance: 'user_declared',
      evidenceKind: 'model_claim',
      sourceLabel: 'user_declared_chatgpt',
      citedExcerpt: '주문과 배송이 나뉘어',
      now: NOW,
    });

    expect(declared.accepted).toBe(true);
    expect(declared.state.externalNotes?.[0]).toMatchObject({
      provenance: 'user_declared',
      userDeclaredReal: true,
      realAnalysisSuccess: false,
      liveModelCall: false,
      verifiedFact: false,
      claimStatus: 'CLAIM',
    });
    expect(declared.comparison.liveVerified).toBe(false);
    expect(declared.comparison.validated).toBe(false);
    expect(JSON.stringify(declared.state)).not.toContain('VALIDATED');
  });

  it('runs the logistics scenarios without counting a test sentence as real analysis', () => {
    const initial = started();
    const before = initial.judgmentText;

    const missingText = recordExternalAnalysis(initial, {
      executionId: 'scenario-d-text',
      text: '   ',
      provenance: 'test_fixture',
      sourceLabel: 'test_fixture',
      now: NOW,
    });
    expect(missingText.accepted).toBe(false);
    expect(missingText.state).toBe(initial);
    expect(missingText.comparison.realAnalysisSuccess).toBe(false);
    expect(missingText.comparison.originalSecured).toBe(false);
    expect(missingText.comparison.nextJudgmentText).toBe(before);

    const missingSource = recordExternalAnalysis(initial, {
      executionId: 'scenario-d-source',
      text: '주문과 배송이 나뉘어 누락이 발생한다.',
      provenance: 'user_declared',
      sourceLabel: ' ',
      now: NOW,
    });
    expect(missingSource.accepted).toBe(false);
    expect(missingSource.state).toBe(initial);
    expect(missingSource.comparison.userDeclaredReal).toBe(false);
    expect(missingSource.comparison.reason).toContain('출처를 확인할 수 없다');

    const scenarioA = acceptPastedAnalysis(initial, {
      executionId: 'scenario-a',
      text: '기업 물류본부 발주서에서 주문 화면과 배송 화면이 분리되어 누락이 발생했다.',
      providerLabel: 'test_fixture',
      provenance: 'test_fixture',
      evidenceKind: 'order_record',
      sourceLabel: 'test_fixture',
      citedExcerpt: '발주서 12건 중 2건이 배송 화면에 없었다',
      now: NOW,
    });
    expect(scenarioA.accepted).toBe(true);
    const afterA = scenarioA.state;
    const comparisonA = afterA.judgmentComparisons?.[0];
    expect(afterA.externalNotes?.[0]).toMatchObject({
      provenance: 'test_fixture',
      realAnalysisSuccess: false,
      userDeclaredReal: false,
      claimStatus: 'CLAIM',
      verifiedFact: false,
    });
    expect(comparisonA).toMatchObject({
      executionId: 'scenario-a',
      previousJudgmentText: before,
      judgmentChanged: true,
      realAnalysisSuccess: false,
      validated: false,
      affectedHypothesisIds: ['h-problem'],
    });
    expect(comparisonA?.nextJudgmentText).toContain('CLAIM');
    expect(afterA.judgmentText).toBe(comparisonA?.nextJudgmentText);
    expect(afterA.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.stance).toBe('supported');
    expect(afterA.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.verifiedFact).toBe(false);
    expect(afterA.nextQuestion?.uncertaintyId).toBe('u-excerpt-origin');
    expect(afterA.nextQuestion?.whyDifferent).toContain('근거 유무를 다시 묻지 않고');

    const scenarioE = applyAnswer(afterA, { choiceId: 'model_words', freeText: '분석 문장이지 고객 원문이 아니다.', now: LATER });
    expect(scenarioE.applied).toBe(true);
    const answerComparison = scenarioE.state.judgmentComparisons?.at(-1);
    expect(answerComparison).toMatchObject({
      kind: 'founder_answer',
      judgmentChanged: false,
      previousJudgmentText: afterA.judgmentText,
      nextJudgmentText: afterA.judgmentText,
      uncertaintyResolved: true,
      realAnalysisSuccess: false,
    });
    expect(answerComparison?.reason).toContain('사업 판단 문장을 바꾸지 않는다');
    expect(scenarioE.state.judgmentText).toBe(afterA.judgmentText);
    expect(scenarioE.state.nextQuestion?.uncertaintyId).not.toBe('u-excerpt-origin');
    expect(scenarioE.state.nextQuestion?.whyDifferent).toBeTruthy();

    const scenarioB = correctField(scenarioE.state, 'customer', '병원 구매팀', AFTER);
    const customerComparison = scenarioB.state.judgmentComparisons?.at(-1);
    expect(customerComparison).toMatchObject({
      kind: 'customer_change',
      judgmentChanged: true,
      realAnalysisSuccess: false,
      validated: false,
      affectedHypothesisIds: ['h-customer', 'h-problem'],
    });
    expect(customerComparison?.previousJudgmentText).toBe(afterA.judgmentText);
    expect(customerComparison?.nextJudgmentText).toContain('병원 구매팀');
    expect(customerComparison?.reason).toContain('옮기지 않는다');
    expect(scenarioB.state.externalNotes?.[0]?.executionId).toBe('scenario-a');
    expect(scenarioB.state.nextQuestion?.uncertaintyId).toBe('u-customer-scope');
    expect(scenarioB.state.nextQuestion?.whyDifferent).toContain('새 고객에게 옮기지 않는다');

    const founder = applyAnswer(scenarioB.state, {
      choiceId: 'applies',
      freeText: '병원 구매팀 담당자가 주문과 배송이 나뉘어 누락된다고 말했다.',
      now: '2026-10-15T09:30:00.000Z',
    });
    const scenarioC = acceptPastedAnalysis(founder.state, {
      executionId: 'scenario-c',
      text: '주문과 배송은 이미 한 화면이라 누락이 발생하지 않는다.',
      providerLabel: 'test_fixture',
      provenance: 'test_fixture',
      evidenceKind: 'model_claim',
      sourceLabel: 'test_fixture',
      now: '2026-10-15T09:40:00.000Z',
    });
    const conflict = scenarioC.state.judgmentComparisons?.at(-1);
    expect(scenarioC.accepted).toBe(true);
    expect(conflict).toMatchObject({
      executionId: 'scenario-c',
      judgmentChanged: true,
      claimStatus: 'CLAIM',
      realAnalysisSuccess: false,
      validated: false,
    });
    expect(conflict?.reason).toContain('충돌');
    expect(conflict?.evidenceIds).toContain(founder.state.answers.at(-1)?.id);
    expect(scenarioC.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.stance).toBe('held');
    expect(scenarioC.state.hypothesisJudgments.find((item) => item.hypothesisId === 'h-problem')?.verifiedFact).toBe(false);
    expect(scenarioC.state.externalNotes?.map((note) => note.text).join('\n')).toContain('발생하지 않는다');
    expect(scenarioC.state.externalNotes?.map((note) => note.text).join('\n')).toContain('분리되어 누락');
    expect(scenarioC.state.judgmentStatus).toBe('judgment_deferred');
    expect(JSON.stringify(scenarioC.state)).not.toContain('VALIDATED');
    expect(scenarioC.state.judgmentText).not.toBe(JUDGMENT_TEXT);
  });
});
