import { describe, expect, it } from 'vitest';

import { applyAnswer, correctField, startJourney } from '../journey-engine';
import { compareReadings, traceJudgmentLoop } from '../judgment-loop';
import { applyEvidenceTransition, emptyJudgment } from '../judgment-transition';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE, type JourneyState } from '../journey-types';
import { verificationActionFor } from '../verification-action';

const NOW = '2026-10-15T03:10:00.000Z';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function answer(state: JourneyState, choiceId: string, freeText = '') {
  const result = applyAnswer(state, { choiceId, freeText, now: NOW });
  if (!result.applied) throw new Error(result.reason);
  return result.state;
}

const geminiReading = {
  side: 'gemini' as const,
  executed: true,
  modelId: 'google/gemini-2.5-flash',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  text: '물류본부 화면의 발췌가 고객 가설과 어긋난다.',
  captureId: 'cap-1',
};

const gptReading = {
  side: 'gpt' as const,
  executed: true,
  modelId: 'gpt-4o-mini',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  text: '물류본부 화면의 발췌가 고객 가설과 어긋난다.',
  captureId: 'cap-1',
};

describe('judgment loop connection', () => {
  it('keeps the customer change local and does not call either model', () => {
    const before = answer(answer(started(), 'interview', '꽃집 한 곳이 말했다'), 'no_scene');
    const beforeText = before.judgmentText;
    const corrected = correctField(before, 'customer', '대기업 물류본부', NOW).state;
    const trace = traceJudgmentLoop(corrected);
    const verification = verificationActionFor(corrected);
    const included = corrected.redelivery?.items.filter((item) => item.disposition === 'included') ?? [];

    expect(included.map((item) => item.role)).toEqual(
      expect.arrayContaining(['customer', 'problem', 'solution', 'payer', 'revenue', 'answer']),
    );
    expect(corrected.redelivery?.inputReady).toBe(true);
    expect(corrected.redelivery?.sent).toBe(false);
    expect(corrected.judgmentText).toBe(beforeText);
    expect(trace.liveModelCall).toBe(false);
    expect(trace.providerObjectsSeparated).toBe(false);
    expect(trace.namedOpenAiProviderId).toBe('gemini');
    expect(trace.researchStatus).toBe('research_not_run');
    expect(trace.counterReviewStatus).toBe('counter_review_not_run');
    expect(trace.stages.find((stage) => stage.id === 'gemini-research')?.status).toBe('not_called');
    expect(trace.stages.find((stage) => stage.id === 'gpt-counter-review')?.status).toBe('blocked_same_provider');
    expect(trace.stages.find((stage) => stage.id === 'judgment')?.status).toBe('not_connected');
    expect(verification.action).toContain('대기업 물류본부');
    expect(verification.action).toContain('절차');
    expect(verification.evidenceNeeded).toContain('업무 절차 관찰 원문');
    expect(verification.affectedHypothesisIds).toEqual(
      expect.arrayContaining(['h-customer', 'h-problem', 'h-solution', 'h-payer', 'h-revenue']),
    );
  });

  it('names the missing role when required context is removed', () => {
    const corrected = correctField(started(), 'customer', '대기업 물류본부', NOW).state;
    const items = corrected.redelivery?.items.filter((item) => item.role !== 'payer') ?? [];
    const missing = ['customer', 'problem', 'solution', 'payer', 'revenue'].filter(
      (role) => !items.some((item) => item.disposition === 'included' && item.role === role),
    );

    expect(missing).toEqual(['payer']);
    expect(corrected.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('links a capture to hypotheses without treating the excerpt as a verified fact', () => {
    const before = emptyJudgment(JUDGMENT_TEXT);
    const result = applyEvidenceTransition({
      previous: before,
      captures: [],
      capture: {
        id: 'cap-1',
        url: 'https://example.com/logistics',
        excerpt: '물류본부 발주 화면의 한 문장',
        pageHash: 'hash-a',
      },
      proposedText: '발췌가 소상공인 고객 가설과 어긋난다.',
      affectedHypothesisIds: ['h-customer', 'h-problem'],
      round: 1,
    });

    expect(result.accepted).toBe(true);
    expect(result.judgment.verifiedFact).toBe(false);
    expect(result.judgment.causeIds).toEqual(['cap-1']);
    expect(result.judgment.hypothesisIds).toEqual(['h-customer', 'h-problem']);
    expect(result.judgment.text).not.toBe(before.text);
    expect(result.judgment.excerpt).toContain('발주 화면');
  });

  it('does not compare the models when the named openai path is still Gemini', () => {
    const aliased = compareReadings(geminiReading, {
      ...gptReading,
      modelId: 'google/gemini-2.5-flash',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      executed: true,
    });
    const notRun = compareReadings(
      { ...geminiReading, executed: false, text: null, captureId: null },
      { ...gptReading, executed: false, text: null, captureId: null },
    );

    expect(aliased.outcome).toBe('not_compared');
    expect(aliased.judgmentChange).toBe('preserved');
    expect(notRun.outcome).toBe('not_compared');
    expect(notRun.verifiedFact).toBe(false);
  });

  it('records agreement, disagreement, and missing evidence without changing the judgment', () => {
    const agreement = compareReadings(geminiReading, gptReading);
    const disagreement = compareReadings(geminiReading, {
      ...gptReading,
      text: '발췌만으로는 고객 가설을 유지할 수 있다.',
    });
    const thin = compareReadings(
      { ...geminiReading, captureId: null },
      { ...gptReading, captureId: null },
    );

    expect(agreement.outcome).toBe('agreement');
    expect(disagreement.outcome).toBe('disagreement');
    expect(thin.outcome).toBe('insufficient_evidence');
    expect(agreement.judgmentChange).toBe('preserved');
    expect(disagreement.judgmentChange).toBe('preserved');
    expect(thin.judgmentChange).toBe('preserved');
    expect(agreement.verifiedFact).toBe(false);
  });
});
