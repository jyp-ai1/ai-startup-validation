import type { FounderBehaviorProfile } from './founder-behavior-store';
import type { DailyChangeItem } from './founder-daily-ceo-loop';
import type { ApprovalQueueItem } from './founder-autonomous-ai-pm';
import { buildCeoApprovalQueue } from './founder-autonomous-ai-pm';
import type { BusinessDeltaJudgment, GeneratedTodayAction } from './founder-intelligence-engine';

export type WhatChangedItem = {
  id: string;
  messageKey: string;
  tone: 'positive' | 'negative';
  params?: Record<string, string | number>;
};

export type DailyCeoHabitBrief = {
  morningChanges: DailyChangeItem[];
  whatChanged: WhatChangedItem[];
  overnightReport: DailyChangeItem[];
  todayFocus: ApprovalQueueItem | null;
  todayFocusHintKey: string;
  todayFocusHintParams?: Record<string, string | number>;
};

function daySeed(projectId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const char of `${projectId}:${today}`) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

function seededPick<T>(pool: T[], count: number, seed: number): T[] {
  if (pool.length === 0) return [];
  const size = Math.min(count, pool.length);
  const indices = pool.map((_, index) => index);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 17) % (i + 1);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, size).map((index) => pool[index]!);
}

const MORNING_CHANGE_POOL: DailyChangeItem[] = [
  { id: 'morning-grant', messageKey: 'grantAdded' },
  { id: 'morning-competitor-price', messageKey: 'competitorPriceChanged' },
  { id: 'morning-interview', messageKey: 'interviewCompleted' },
  { id: 'morning-search', messageKey: 'searchVolumeUp' },
  { id: 'morning-competitor-new', messageKey: 'competitorDiscovered' },
  { id: 'morning-grant-open', messageKey: 'grantApplicationOpen' },
];

const WHAT_CHANGED_POSITIVE: WhatChangedItem[] = [
  { id: 'wc-competitor', messageKey: 'competitorAdded', tone: 'positive' },
  { id: 'wc-search', messageKey: 'searchVolumeUp', tone: 'positive' },
  { id: 'wc-grant', messageKey: 'grantAdded', tone: 'positive' },
  { id: 'wc-interview', messageKey: 'interviewInsight', tone: 'positive' },
];

const WHAT_CHANGED_NEGATIVE: WhatChangedItem[] = [
  { id: 'wc-deadline', messageKey: 'grantDeadlineSoon', tone: 'negative', params: { days: 3 } },
  { id: 'wc-competitor-price', messageKey: 'competitorPriceDrop', tone: 'negative' },
  { id: 'wc-market', messageKey: 'marketNoiseUp', tone: 'negative' },
];

const OVERNIGHT_REPORT_ITEMS: DailyChangeItem[] = [
  { id: 'report-market', messageKey: 'marketResearch' },
  { id: 'report-grant', messageKey: 'grantCheck' },
  { id: 'report-competitor', messageKey: 'competitorPriceCollect' },
  { id: 'report-news', messageKey: 'newsAnalysis' },
];

const FOCUS_HINT_KEYS = [
  'pricingOnly',
  'interviewOnly',
  'competitorOnly',
  'oneApproval',
] as const;

function morningChangesFromDeltas(deltas: BusinessDeltaJudgment[]): DailyChangeItem[] {
  return deltas.slice(0, 3).map((delta): DailyChangeItem => {
    if (delta.category === 'competitor') {
      return { id: `delta-${delta.id}`, messageKey: 'competitorPriceChanged' };
    }
    if (delta.category === 'government') {
      return { id: `delta-${delta.id}`, messageKey: 'grantAdded' };
    }
    if (delta.category === 'market') {
      return { id: `delta-${delta.id}`, messageKey: 'searchVolumeUp' };
    }
    return { id: `delta-${delta.id}`, messageKey: 'interviewCompleted' };
  });
}

export function buildDailyCeoHabitBrief(input: {
  projectId: string;
  behavior: FounderBehaviorProfile | null;
  businessDeltas: BusinessDeltaJudgment[];
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): DailyCeoHabitBrief {
  const seed = daySeed(input.projectId);
  const deltaMorning = morningChangesFromDeltas(input.businessDeltas);
  const morningChanges =
    deltaMorning.length >= 3
      ? deltaMorning.slice(0, 3)
      : seededPick(MORNING_CHANGE_POOL, 3, seed);

  const positives = seededPick(WHAT_CHANGED_POSITIVE, 2, seed + 3);
  const negatives = seededPick(WHAT_CHANGED_NEGATIVE, 1, seed + 7);
  const whatChanged = [...positives, ...negatives];

  const queue = buildCeoApprovalQueue(input.todayActions, input.resolveTitle);
  const todayFocus = queue[0] ?? null;
  const hintKey = FOCUS_HINT_KEYS[seed % FOCUS_HINT_KEYS.length] ?? 'oneApproval';

  return {
    morningChanges,
    whatChanged,
    overnightReport: OVERNIGHT_REPORT_ITEMS,
    todayFocus,
    todayFocusHintKey: hintKey,
    todayFocusHintParams:
      hintKey === 'pricingOnly' ? { action: todayFocus?.title ?? '가격 검증' } : undefined,
  };
}
