import { describe, expect, it } from 'vitest';

import { getResearchProvider } from '@/features/agents/research/providers';

import { applyEvidenceTransition, emptyJudgment, LOOP_ROUND_CAP } from '../judgment-transition';
import { executionBadgeLabel } from '../present-execution';
import { JUDGMENT_TEXT } from '../journey-types';

const capture = {
  id: 'cap-1',
  url: 'https://example.com/logistics',
  excerpt: '물류본부 발주 화면의 한 문장',
  pageHash: 'hash-a',
};

describe('evidence transition and execution badges', () => {
  it('keeps the judgment when no capture arrives', () => {
    const previous = emptyJudgment(JUDGMENT_TEXT);
    const result = applyEvidenceTransition({
      previous,
      captures: [],
      round: 1,
    });

    expect(result.accepted).toBe(false);
    expect(result.judgment.text).toBe(JUDGMENT_TEXT);
    expect(result.execution).toBe('not_run');
    expect(result.captures).toEqual([]);
  });

  it('links a new capture to the cause without calling the text a verified fact', () => {
    const result = applyEvidenceTransition({
      previous: emptyJudgment(JUDGMENT_TEXT),
      captures: [],
      capture,
      proposedText: '물류본부 화면의 발췌가 고객 가설과 어긋난다.',
      round: 1,
    });

    expect(result.accepted).toBe(true);
    expect(result.judgment.verifiedFact).toBe(false);
    expect(result.judgment.causeIds).toEqual(['cap-1']);
    expect(result.judgment.captureId).toBe('cap-1');
    expect(result.judgment.sourceUrl).toBe(capture.url);
    expect(result.judgment.excerpt).toBe(capture.excerpt);
    expect(result.judgment.status).toBe('judgment_provisional');
    expect(result.execution).toBe('capture_recorded');
  });

  it('does not add the same page hash or change the judgment', () => {
    const first = applyEvidenceTransition({
      previous: emptyJudgment(JUDGMENT_TEXT),
      captures: [],
      capture,
      round: 1,
    });
    const second = applyEvidenceTransition({
      previous: first.judgment,
      captures: first.captures,
      capture: { ...capture, id: 'cap-2' },
      proposedText: '같은 페이지로 판단을 바꾼다.',
      round: 2,
    });

    expect(second.execution).toBe('duplicate_evidence');
    expect(second.accepted).toBe(false);
    expect(second.judgment.text).toBe(first.judgment.text);
    expect(second.captures).toHaveLength(1);
  });

  it('preserves the judgment after browser, model, empty, and missing-key failures', () => {
    const previous = emptyJudgment(JUDGMENT_TEXT);
    const history = [capture];
    for (const failure of ['browser_failed', 'model_failed', 'empty_response', 'key_missing'] as const) {
      const result = applyEvidenceTransition({
        previous,
        captures: history,
        capture,
        proposedText: '실패 뒤에 판단을 바꾼다.',
        failure,
        round: 1,
      });
      expect(result.judgment).toEqual(previous);
      expect(result.captures).toBe(history);
      expect(result.execution).toBe(failure);
      expect(result.accepted).toBe(false);
    }
  });

  it('rejects a change with no cause and a change that claims a verified fact', () => {
    const noCause = applyEvidenceTransition({
      previous: emptyJudgment(JUDGMENT_TEXT),
      captures: [],
      capture: { ...capture, id: '' },
      proposedText: '원인 없이 바꾼다.',
      round: 1,
    });
    const promoted = applyEvidenceTransition({
      previous: emptyJudgment(JUDGMENT_TEXT),
      captures: [],
      capture,
      proposedText: '이 사업은 검증된 사실이다.',
      round: 1,
    });

    expect(noCause.accepted).toBe(false);
    expect(noCause.judgment.text).toBe(JUDGMENT_TEXT);
    expect(promoted.accepted).toBe(false);
    expect(promoted.judgment.verifiedFact).toBe(false);
    expect(promoted.judgment.text).toBe(JUDGMENT_TEXT);
  });

  it('holds at the round cap instead of treating the cap as success or failure', () => {
    const result = applyEvidenceTransition({
      previous: emptyJudgment(JUDGMENT_TEXT),
      captures: [capture],
      capture: { ...capture, id: 'cap-9', pageHash: 'hash-b' },
      proposedText: '상한 뒤에 바꾼다.',
      round: LOOP_ROUND_CAP,
    });

    expect(result.heldForCap).toBe(true);
    expect(result.execution).toBe('round_cap_held');
    expect(result.judgment.text).toBe(JUDGMENT_TEXT);
    expect(result.judgment.status).toBe('judgment_deferred');
    expect(result.reason).toContain('성공도 실패도 아니');
  });

  it('matches badge text to the execution status', () => {
    expect(executionBadgeLabel('research', 'research_not_run')).toBe('조사 미실행');
    expect(executionBadgeLabel('counterReview', 'counter_review_not_run')).toBe('반대 검토 미실행');
    expect(executionBadgeLabel('judgment', 'judgment_deferred')).toBe('판단 유보');
    expect(executionBadgeLabel('research', 'research_failed')).toBe('조사 실패');
    expect(executionBadgeLabel('counterReview', 'counter_review_completed')).toBe('반대 검토 기록 있음');
  });

  it('keeps the openai provider object apart from Gemini', () => {
    const gemini = getResearchProvider('gemini');
    const openai = getResearchProvider('openai');

    expect(openai).not.toBe(gemini);
    expect(gemini.id).toBe('gemini');
    expect(openai.id).toBe('openai');
  });
});
