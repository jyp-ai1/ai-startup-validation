import type { DecisionMemoryEntry } from './v2-decision-memory-store';
import { formatDecisionDate } from './v2-decision-memory-store';

export type StoryActor = 'ai' | 'founder';

export type StoryPeriod = 'today' | 'yesterday' | 'lastWeek';

export type DecisionStoryBeat = {
  id: string;
  actor: StoryActor;
  dateLabel: string;
  text: string;
  period: StoryPeriod;
  /** Rich narrative line (optional multi-part story) */
  narrative?: string;
};

/** Mock narrative — Sprint 3 replaces with real event stream. */
export const MOCK_DECISION_STORY: DecisionStoryBeat[] = [
  {
    id: 'story-1',
    actor: 'founder',
    dateLabel: '7월 26일',
    text: '고객을 변경했습니다.',
    period: 'yesterday',
    narrative: '예비창업자 → 스타트업 대표',
  },
  {
    id: 'story-2',
    actor: 'ai',
    dateLabel: '7월 26일',
    text: '시장성이 낮다고 판단했습니다.',
    period: 'yesterday',
    narrative: '시장 판단 ★★★',
  },
  {
    id: 'story-3',
    actor: 'founder',
    dateLabel: '7월 27일',
    text: '고객 세그먼트를 B2B 스타트업 PM으로 구체화했습니다.',
    period: 'today',
    narrative: '예비창업자 → 스타트업 대표',
  },
  {
    id: 'story-4',
    actor: 'ai',
    dateLabel: '7월 27일',
    text: '시장 판단을 수정했습니다.',
    period: 'today',
    narrative: '★★★ → ★★★★★ · B2B 검색량 증가',
  },
  {
    id: 'story-5',
    actor: 'founder',
    dateLabel: '7월 27일',
    text: '가격 가설을 입력했습니다.',
    period: 'today',
  },
  {
    id: 'story-6',
    actor: 'ai',
    dateLabel: '7월 27일',
    text: '수익성 검토가 가능해졌습니다.',
    period: 'today',
    narrative: '가격 Confidence 상승',
  },
  {
    id: 'story-7',
    actor: 'founder',
    dateLabel: '7월 20일',
    text: '첫 아이디어를 입력했습니다.',
    period: 'lastWeek',
  },
  {
    id: 'story-8',
    actor: 'ai',
    dateLabel: '7월 21일',
    text: '초기 시장 스캔을 시작했습니다.',
    period: 'lastWeek',
  },
];

export type RecentChangeFlowItem = {
  id: string;
  label: string;
};

export const MOCK_RECENT_CHANGE_FLOW: RecentChangeFlowItem[] = [
  { id: '1', label: '고객 수정' },
  { id: '2', label: '시장 판단 변경' },
  { id: '3', label: '새로운 근거 발견' },
  { id: '4', label: '가격 검토 필요' },
];

export type StoryPeriodGroup = {
  period: StoryPeriod;
  beats: DecisionStoryBeat[];
};

const PERIOD_ORDER: StoryPeriod[] = ['today', 'yesterday', 'lastWeek'];

export function buildDecisionStory(
  entries: DecisionMemoryEntry[],
  lastReviewAt: Date | null,
  locale: string,
  reviewCount: number,
): DecisionStoryBeat[] {
  if (reviewCount === 0) return [];

  const beats: DecisionStoryBeat[] = [...MOCK_DECISION_STORY];

  for (const entry of entries.slice(0, 2)) {
    beats.push({
      id: `memory-${entry.id}`,
      actor: 'founder',
      dateLabel: formatDecisionDate(entry.decidedAt, locale),
      text: entry.decision,
      period: 'today',
    });
  }

  if (lastReviewAt && reviewCount > 0) {
    beats.push({
      id: 'review-latest',
      actor: 'ai',
      dateLabel: formatDecisionDate(lastReviewAt.toISOString(), locale),
      text: 'Evidence를 갱신하고 판단을 업데이트했습니다.',
      period: 'today',
    });
  }

  return beats;
}

export function groupStoryByPeriod(beats: DecisionStoryBeat[]): StoryPeriodGroup[] {
  return PERIOD_ORDER.map((period) => ({
    period,
    beats: beats.filter((b) => b.period === period),
  })).filter((g) => g.beats.length > 0);
}
