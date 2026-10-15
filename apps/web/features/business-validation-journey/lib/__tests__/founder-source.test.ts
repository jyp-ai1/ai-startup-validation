import { describe, expect, it, vi } from 'vitest';

import { getResearchProvider } from '@/features/agents/research/providers';
import {
  gateCounterReview,
  OpenAICounterReviewProvider,
} from '@/features/agents/research/providers/openai-counter-review-provider';
import type { ResearchRequest } from '@/features/agents/research/services/research-agent-types';

import { attachFounderSource, sourceHash } from '../founder-source';
import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, TEST_HYPOTHESIS_INTAKE } from '../journey-types';

const NOW = '2026-10-15T03:20:00.000Z';
const QUOTE = '물류본부 담당자가 발주와 배송 화면이 따로라고 적힌 메모 한 줄';

function started() {
  const result = startJourney(TEST_HYPOTHESIS_INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

describe('founder source and gpt gate', () => {
  it('runs the transition only when the source text and cause id are both present', () => {
    const state = started();
    const ready = attachFounderSource(state, {
      text: QUOTE,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-1',
      now: NOW,
    });
    const noCause = attachFounderSource(state, {
      text: QUOTE,
      hypothesisIds: ['h-problem'],
      causeId: '',
      now: NOW,
    });

    expect(ready.transitionRan).toBe(true);
    expect(ready.state.sourceRecords).toHaveLength(1);
    expect(noCause.transitionRan).toBe(false);
    expect(noCause.state.judgmentText).toBe(JUDGMENT_TEXT);
  });

  it('keeps the judgment when the cause or the text is missing and names the gap', () => {
    const state = started();
    const empty = attachFounderSource(state, {
      text: '   ',
      hypothesisIds: ['h-customer'],
      causeId: 'cause-1',
      now: NOW,
    });
    const noHypothesis = attachFounderSource(state, {
      text: QUOTE,
      hypothesisIds: [],
      causeId: 'cause-1',
      now: NOW,
    });

    expect(empty.missing).toContain('원문');
    expect(noHypothesis.missing).toContain('관련 가설');
    expect(empty.state).toBe(state);
    expect(noHypothesis.state.judgmentText).toBe(state.judgmentText);
    expect(empty.reason).toContain('판단 문장은 바꾸지 않는다');
  });

  it('keeps the claim label and hypothesis link without promoting the paste', () => {
    const result = attachFounderSource(started(), {
      text: QUOTE,
      hypothesisIds: ['h-customer', 'h-problem'],
      causeId: 'cause-1',
      now: NOW,
    });
    const record = result.state.sourceRecords[0];

    expect(record?.hypothesisIds).toEqual(['h-customer', 'h-problem']);
    expect(record?.claimLabel).toBe('창업자가 붙인 원문 · 검증된 사실 아님');
    expect(record?.verifiedFact).toBe(false);
    expect(record?.relevance).toBe('unconfirmed');
    expect(record?.sourceKind).toBe('founder_paste');
    expect(result.state.judgmentStatus).toBe('judgment_deferred');
  });

  it('does not count the same source hash as new evidence', () => {
    const first = attachFounderSource(started(), {
      text: QUOTE,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-1',
      now: NOW,
    });
    const second = attachFounderSource(first.state, {
      text: `  ${QUOTE}  `,
      hypothesisIds: ['h-problem'],
      causeId: 'cause-2',
      now: NOW,
    });

    expect(sourceHash(QUOTE)).toBe(sourceHash(`  ${QUOTE}  `));
    expect(second.state.sourceRecords).toHaveLength(1);
    expect(second.reason).toContain('같은 원문 해시');
    expect(second.state.judgmentText).toBe(first.state.judgmentText);
  });

  it('traces the judgment text before and after a linked source', () => {
    const before = started();
    const result = attachFounderSource(before, {
      text: QUOTE,
      hypothesisIds: ['h-solution'],
      causeId: 'cause-9',
      now: NOW,
    });
    const record = result.state.sourceRecords[0];

    expect(record?.previousJudgmentText).toBe(before.judgmentText);
    expect(record?.nextJudgmentText).toBe(before.judgmentText);
    expect(record?.causeId).toBe('cause-9');
    expect(record?.reason).toContain('판단 유보를 유지');
    expect(record?.accepted).toBe(false);
  });

  it('does not call the network when the gpt key is absent', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const gate = gateCounterReview(false);
    const provider = new OpenAICounterReviewProvider();

    expect(gate.execution).toBe('key_missing');
    expect(gate.networkCalled).toBe(false);
    expect(gate.status).toBe('counter_review_not_run');
    await expect(provider.execute({} as ResearchRequest, [])).rejects.toThrow(/호출을 하지 않는다|호출을 열지 않는다/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('keeps gemini and gpt statuses from overwriting each other', () => {
    const gemini = getResearchProvider('gemini');
    const gpt = getResearchProvider('openai');
    const result = attachFounderSource(started(), {
      text: QUOTE,
      hypothesisIds: ['h-payer'],
      causeId: 'cause-3',
      now: NOW,
    });

    expect(gemini.id).toBe('gemini');
    expect(gpt.id).toBe('openai');
    expect(gemini).not.toBe(gpt);
    expect(result.state.researchStatus).toBe('research_not_run');
    expect(result.state.counterReviewStatus).toBe('counter_review_not_run');
    expect(gateCounterReview(false).status).toBe('counter_review_not_run');
  });
});
