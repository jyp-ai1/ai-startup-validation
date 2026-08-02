import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** S6.1 — stable ID for S6.2 Header · S7 Review · future Memory. */
export const LEARNING_EVENT = {
  CUSTOMER_BUYER_SPLIT: 'LEARNING_CUSTOMER_BUYER_SPLIT',
  CUSTOMER_PAYER_CLEAR: 'LEARNING_CUSTOMER_PAYER_CLEAR',
  CUSTOMER_USER_CLEAR: 'LEARNING_CUSTOMER_USER_CLEAR',
  CUSTOMER_SEGMENT_REFINED: 'LEARNING_CUSTOMER_SEGMENT_REFINED',
  PROBLEM_REFINED: 'LEARNING_PROBLEM_REFINED',
  VALUE_PROPOSITION: 'LEARNING_VALUE_PROPOSITION',
  COMPETITOR_ALTERNATIVE: 'LEARNING_COMPETITOR_ALTERNATIVE',
  MARKET_SEGMENT: 'LEARNING_MARKET_SEGMENT',
} as const;

export type LearningEventId = (typeof LEARNING_EVENT)[keyof typeof LEARNING_EVENT];

/** S6.1 — shared learning (not "AI learned"). */
export type BusinessLearningSummary = {
  eventId: LearningEventId;
  insight: string;
};

/** S6.1 — fields that will change in the snapshot (S6.2 applies to header). */
export type BusinessSnapshotFieldUpdate = {
  field: string;
  value: string;
};

/** S6.1 — causal link between CEO answer and business state change. */
export type BusinessSnapshotUpdateEvent = {
  eventId: LearningEventId;
  turnIssueId: AiPmLoopIssueId;
  learning: BusinessLearningSummary;
  updates: BusinessSnapshotFieldUpdate[];
  appliedAt: string;
};

type SharedLearning = BusinessLearningSummary;

function normalizeRolePhrase(text: string): string {
  return text.replace(/(?:입니다|이에요|예요|입니다\.)\s*$/u, '').trim();
}

function extractUserRole(answer: string): string | null {
  const userMatch = answer.match(/사용자(?:는|가)?\s*([^,.。\n]{1,16})/);
  if (userMatch?.[1]) return normalizeRolePhrase(userMatch[1]);
  if (/공장장/i.test(answer)) return '공장장';
  if (/설비\s*관리|관리자/i.test(answer)) return '설비 관리자';
  if (/실무|담당|팀장/i.test(answer)) return '실무 사용자';
  return null;
}

function extractPayerRole(answer: string): string | null {
  const payerMatch = answer.match(/구매자(?:는|가)?\s*([^,.。\n]{1,16})/);
  if (payerMatch?.[1]) return normalizeRolePhrase(payerMatch[1]);
  if (/대표|CEO|ceo/i.test(answer)) return '대표';
  return null;
}

function truncate(text: string, max = 40): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function customerSharedLearning(answer: string): SharedLearning {
  const user = extractUserRole(answer);
  const payer = extractPayerRole(answer);

  if (user && payer) {
    return {
      eventId: LEARNING_EVENT.CUSTOMER_BUYER_SPLIT,
      insight: '방금 답변 덕분에 사용자와 구매자를 구분해서 이야기할 수 있게 되었습니다.',
    };
  }
  if (payer) {
    return {
      eventId: LEARNING_EVENT.CUSTOMER_PAYER_CLEAR,
      insight: '방금 답변 덕분에 구매자를 더 선명하게 이야기할 수 있게 되었습니다.',
    };
  }
  if (user) {
    return {
      eventId: LEARNING_EVENT.CUSTOMER_USER_CLEAR,
      insight: '방금 답변 덕분에 사용자를 더 선명하게 이야기할 수 있게 되었습니다.',
    };
  }
  return {
    eventId: LEARNING_EVENT.CUSTOMER_SEGMENT_REFINED,
    insight: '방금 답변 덕분에 고객 범위를 더 구체적으로 이야기할 수 있게 되었습니다.',
  };
}

function customerFieldUpdates(answer: string): BusinessSnapshotFieldUpdate[] {
  const updates: BusinessSnapshotFieldUpdate[] = [];
  const segment = answer
    .replace(/구매자(?:는|가)?[^,.。]*/gi, '')
    .replace(/사용자(?:는|가)?[^,.。]*/gi, '')
    .trim();

  if (segment.length >= 4) {
    updates.push({ field: '고객', value: truncate(segment, 40) });
  }

  const user = extractUserRole(answer);
  if (user) updates.push({ field: '사용자', value: user });

  const payer = extractPayerRole(answer);
  if (payer) updates.push({ field: '구매자', value: payer });

  return updates;
}

const SHARED_LEARNING: Record<AiPmLoopIssueId, (answer: string) => SharedLearning> = {
  customer_definition: customerSharedLearning,
  problem_definition: () => ({
    eventId: LEARNING_EVENT.PROBLEM_REFINED,
    insight: '방금 답변 덕분에 문제를 한 단계 더 선명하게 이야기할 수 있게 되었습니다.',
  }),
  bm_design: () => ({
    eventId: LEARNING_EVENT.VALUE_PROPOSITION,
    insight: '방금 답변 덕분에 가치제안을 더 구체적으로 이야기할 수 있게 되었습니다.',
  }),
  competitor_analysis: () => ({
    eventId: LEARNING_EVENT.COMPETITOR_ALTERNATIVE,
    insight: '방금 답변 덕분에 대체재를 더 선명하게 이야기할 수 있게 되었습니다.',
  }),
  market_validation: () => ({
    eventId: LEARNING_EVENT.MARKET_SEGMENT,
    insight: '방금 답변 덕분에 시장을 더 구체적으로 이야기할 수 있게 되었습니다.',
  }),
};

const FIELD_UPDATES: Record<AiPmLoopIssueId, (answer: string) => BusinessSnapshotFieldUpdate[]> = {
  customer_definition: customerFieldUpdates,
  problem_definition: (answer) => [{ field: '문제', value: truncate(answer, 48) }],
  bm_design: (answer) => [{ field: '가치제안', value: truncate(answer, 48) }],
  competitor_analysis: (answer) => [{ field: '대체재', value: truncate(answer, 48) }],
  market_validation: (answer) => [{ field: '시장', value: truncate(answer, 48) }],
};

/** Shared learning from one CEO answer — "we understand together", not AI solo. */
export function buildBusinessLearningFromTurn(turn: AiPmLoopTurn): BusinessLearningSummary {
  return SHARED_LEARNING[turn.issueId](turn.answer);
}

/** Snapshot update event — consumed by S6.2 header · S7 review · memory. */
export function buildSnapshotUpdateEvent(turn: AiPmLoopTurn): BusinessSnapshotUpdateEvent {
  const learning = buildBusinessLearningFromTurn(turn);
  return {
    eventId: learning.eventId,
    turnIssueId: turn.issueId,
    learning,
    updates: FIELD_UPDATES[turn.issueId](turn.answer),
    appliedAt: turn.appliedAt,
  };
}
