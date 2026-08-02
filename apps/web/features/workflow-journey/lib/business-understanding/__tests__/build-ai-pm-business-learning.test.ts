import { describe, expect, it } from 'vitest';

import {
  buildBusinessLearningFromTurn,
  buildSnapshotUpdateEvent,
  LEARNING_EVENT,
} from '../build-ai-pm-business-learning';

describe('build-ai-pm-business-learning', () => {
  it('uses shared-learning voice for user vs payer split', () => {
    const learning = buildBusinessLearningFromTurn({
      issueId: 'customer_definition',
      answer: '30인 이하 제조기업. 사용자는 공장장, 구매자는 대표.',
      appliedAt: new Date().toISOString(),
    });

    expect(learning.eventId).toBe(LEARNING_EVENT.CUSTOMER_BUYER_SPLIT);
    expect(learning.insight).toContain('덕분에');
    expect(learning.insight).toContain('사용자');
    expect(learning.insight).toContain('구매자');
    expect(learning.insight).toContain('이야기할 수 있게');
    expect(learning.insight).not.toContain('배웠');
  });

  it('uses shared-learning voice for problem refinement', () => {
    const learning = buildBusinessLearningFromTurn({
      issueId: 'problem_definition',
      answer: '설비 멈춤으로 생산 차질',
      appliedAt: new Date().toISOString(),
    });

    expect(learning.eventId).toBe(LEARNING_EVENT.PROBLEM_REFINED);
    expect(learning.insight).toContain('덕분에');
    expect(learning.insight).toContain('선명하게');
  });

  it('builds snapshot update event with learning event id + field updates', () => {
    const event = buildSnapshotUpdateEvent({
      issueId: 'customer_definition',
      answer: '구매자는 대표입니다. 사용자는 공장장입니다.',
      appliedAt: '2026-08-02T00:00:00.000Z',
    });

    expect(event.eventId).toBe(LEARNING_EVENT.CUSTOMER_BUYER_SPLIT);
    expect(event.learning.eventId).toBe(LEARNING_EVENT.CUSTOMER_BUYER_SPLIT);
    expect(event.updates.some((update) => update.field === '사용자' && update.value === '공장장')).toBe(
      true,
    );
    expect(event.updates.some((update) => update.field === '구매자' && update.value === '대표')).toBe(
      true,
    );
    expect(event.appliedAt).toBe('2026-08-02T00:00:00.000Z');
  });

  it('maps value proposition learning event from bm turn', () => {
    const event = buildSnapshotUpdateEvent({
      issueId: 'bm_design',
      answer: '월 구독으로 공장당 센서 패키지',
      appliedAt: new Date().toISOString(),
    });

    expect(event.eventId).toBe(LEARNING_EVENT.VALUE_PROPOSITION);
  });
});
