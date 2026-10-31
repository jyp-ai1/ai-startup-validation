import { describe, expect, it } from 'vitest';

import { readingFromInput, readingFromSections, restoredMarks, reviseReading } from '../ai-pm-review-marks';
import type { ReviewSections } from '../ai-pm-review-store';

const sections = (): ReviewSections => ({
  customer: '양조장 체험을 찾는 여행객',
  problem: '양조장 체험을 찾기 어렵다',
  market: '예약 한 건',
  revenueModel: '양조장 마케팅 비용',
  execution: '체험과 주변 관광을 연결한다',
  risks: ['가격은 입력에 없으면 적지 않는다.'],
  uncertain: ['예약과 마케팅비 지불이 확인되지 않음'],
  hypotheses: ['예약과 마케팅비 지불이 확인되지 않음'],
  judgment: '양조장 체험을 여행객에게 연결하는 사업',
  nextQuestion: '누가 실제로 비용을 지불하는 사업인가요?',
  nextQuestionReason: '여행객 예약비와 양조장 마케팅비를 구분합니다.',
  answerHint: '확인된 사실만 적는다.',
  claimConfirmation: null,
});

describe('ai pm review marks', () => {
  it('keeps an input reading free of an invented hypothesis', () => {
    const reading = readingFromInput('양조장 체험과 주변 관광을 연결하는 사업입니다.');
    expect(reading.source).toBe('input-only');
    expect(reading.hypothesis).toBeNull();
    expect(reading.question).toBeNull();
    expect(reading.summary).toContain('양조장 체험');
  });

  it('shows a model reading and then applies the founder marks without a new call', () => {
    const reading = readingFromSections(sections());
    expect(reading.source).toBe('model-review');
    expect(reading.question).toBe('누가 실제로 비용을 지불하는 사업인가요?');
    const revised = reviseReading(reading, ['understanding_wrong', 'question_unfit'], '여행객 예약비는 아직 없다.');
    expect(revised.notes.some((note) => note.includes('오류로 표시'))).toBe(true);
    expect(revised.question).not.toBe(reading.question);
    expect(revised.founderFact).toContain('여행객 예약비');
    expect(revised.showIdea).toBe(true);
    expect(reviseReading(reading, ['unnecessary']).showIdea).toBe(false);
  });

  it('reopens the latest stored correction and keeps a browser selection ahead of it', () => {
    const account = restoredMarks(
      [
        { marks: ['evidence_unclear'], submittedAt: '2026-10-28T08:15:19.600Z' },
        { marks: ['understanding_wrong', 'core_missing'], submittedAt: '2026-10-28T09:00:00.000Z' },
      ],
      null,
    );
    expect(account.where).toBe('account');
    expect(account.marks).toEqual(['understanding_wrong', 'core_missing']);
    const revised = reviseReading(readingFromSections(sections()), account.marks);
    expect(revised.notes.some((note) => note.includes('오류로 표시'))).toBe(true);
    expect(revised.notes.some((note) => note.includes('빠진 핵심'))).toBe(true);

    const browser = restoredMarks(
      [{ marks: ['evidence_unclear'], submittedAt: '2026-10-28T08:15:19.600Z' }],
      { marks: ['core_missing'], fact: '' },
    );
    expect(browser.where).toBe('browser');
    expect(browser.marks).toEqual(['core_missing']);
  });
});
