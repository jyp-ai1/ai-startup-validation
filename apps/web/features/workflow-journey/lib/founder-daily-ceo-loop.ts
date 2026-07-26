import type { StrategyPipelineResult } from '@repo/agents';

import type { FounderBehaviorProfile } from './founder-behavior-store';
import { buildAiPmInboxItems } from './founder-ai-pm-inbox';
import type {
  BusinessDeltaJudgment,
  FounderDailyReview,
  GeneratedTodayAction,
} from './founder-intelligence-engine';
import type { FounderEvidenceEntry } from './founder-evidence-store';
import type { WeeklyCeoReview } from './founder-personalization-engine';

export type DailyChangeItem = {
  id: string;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type DailyCeoOperatingBrief = {
  isReturningVisit: boolean;
  overnightChanges: DailyChangeItem[];
  morningChanges: DailyChangeItem[];
  todayActionTitle: string;
  todayActionMinutes: number;
  todayActionId?: string;
  todayGoImpact: number;
  scoreBefore: number;
  scoreAfter: number;
  pendingInboxCount: number;
  showEveningReview: boolean;
  eveningDelta: number;
  weeklyScoreFrom?: number;
  weeklyScoreTo?: number;
};

function defaultOvernightChanges(): DailyChangeItem[] {
  return [
    { id: 'competitor-price', messageKey: 'competitorPriceChange', params: { name: 'A' } },
    { id: 'grant-posted', messageKey: 'grantPosted' },
    { id: 'interview-analyzed', messageKey: 'interviewAnalyzed' },
  ];
}

function changesFromDeltas(deltas: BusinessDeltaJudgment[]): DailyChangeItem[] {
  return deltas.slice(0, 3).map((delta): DailyChangeItem => {
    if (delta.category === 'competitor') {
      return {
        id: `delta-${delta.id}`,
        messageKey: 'competitorPriceChange',
        params: { name: 'A' },
      };
    }
    if (delta.category === 'government') {
      return {
        id: `delta-${delta.id}`,
        messageKey: 'grantPosted',
        params: { days: 4 },
      };
    }
    if (delta.category === 'market') {
      return { id: `delta-${delta.id}`, messageKey: 'marketSignal' };
    }
    return { id: `delta-${delta.id}`, messageKey: 'investmentSignal' };
  });
}

function changesFromEvidence(evidence: FounderEvidenceEntry[]): DailyChangeItem[] {
  return evidence.slice(-2).reverse().map((entry) => ({
    id: `evidence-${entry.id}`,
    messageKey: entry.category === 'customer' ? 'interviewAnalyzed' : 'analysisReady',
  }));
}

export function buildDailyCeoOperatingBrief(input: {
  projectId: string;
  behavior: FounderBehaviorProfile | null;
  scorePercent: number;
  primaryAction?: GeneratedTodayAction;
  businessDeltas: BusinessDeltaJudgment[];
  evidence: FounderEvidenceEntry[];
  todayActions: GeneratedTodayAction[];
  dailyReview: FounderDailyReview;
  weeklyReview?: WeeklyCeoReview;
  pipeline: StrategyPipelineResult | null;
}): DailyCeoOperatingBrief {
  const {
    behavior,
    scorePercent,
    primaryAction,
    businessDeltas,
    evidence,
    todayActions,
    dailyReview,
    weeklyReview,
  } = input;

  const isReturningVisit = (behavior?.visitCount ?? 1) >= 2;
  const deltaChanges = changesFromDeltas(businessDeltas);
  const evidenceChanges = changesFromEvidence(evidence);
  const merged = [...deltaChanges, ...evidenceChanges];
  const overnightChanges =
    merged.length >= 2 ? merged.slice(0, 3) : defaultOvernightChanges();

  const inboxItems = buildAiPmInboxItems(businessDeltas, evidence, todayActions);
  const action = primaryAction ?? todayActions[0];
  const goImpact = action?.goImpact ?? 4;

  const completedToday = (behavior?.actionHistory ?? []).some((entry) => {
    const today = new Date().toISOString().slice(0, 10);
    return entry.completedAt.slice(0, 10) === today;
  });

  const snapshots = behavior?.scoreSnapshots ?? [];
  const weeklyScoreFrom =
    weeklyReview?.scoreFrom ??
    (snapshots.length >= 2 ? snapshots[0]?.score : Math.max(20, scorePercent - 14));
  const weeklyScoreTo = weeklyReview?.scoreTo ?? scorePercent;

  return {
    isReturningVisit,
    overnightChanges,
    morningChanges: overnightChanges,
    todayActionTitle: action?.title ?? '가격 검증',
    todayActionMinutes: action?.etaMinutes ?? 15,
    todayActionId: action?.id,
    todayGoImpact: goImpact,
    scoreBefore: scorePercent,
    scoreAfter: Math.min(100, scorePercent + goImpact),
    pendingInboxCount: inboxItems.length,
    showEveningReview: completedToday || dailyReview.scoreDelta > 0,
    eveningDelta: completedToday ? dailyReview.scoreDelta || goImpact : dailyReview.scoreDelta,
    weeklyScoreFrom,
    weeklyScoreTo,
  };
}
