import type { FounderBehaviorProfile } from './founder-behavior-store';
import { hasRepeatedDeferral } from './founder-behavior-store';
import type { DailyChangeItem } from './founder-daily-ceo-loop';
import type {
  BusinessProgressDimension,
  FounderDailyReview,
  GeneratedTodayAction,
} from './founder-intelligence-engine';
import type { MemoryGeneratedAction } from './founder-memory-store';

export type ApprovalQueueItem = {
  id: string;
  actionId: string;
  title: string;
  goImpact: number;
  order: number;
};

export type DailyReportBrief = {
  completedItems: DailyChangeItem[];
  scoreFrom: number;
  scoreTo: number;
  tomorrowFocus: string;
  showReport: boolean;
};

export type BusinessTimelineMilestone = {
  id: string;
  labelKey: string;
  status: 'done' | 'current' | 'upcoming';
};

export type AiPmMemoryBrief = {
  show: boolean;
  messageKey: 'interviewDeferRecall' | 'pricingDeferRecall' | 'deferredRecall' | 'patternRecall';
  params?: Record<string, string | number>;
  recommendedActionId?: string;
  recommendedTitle: string;
};

function defaultOvernightWork(): DailyChangeItem[] {
  return [
    { id: 'overnight-competitor', messageKey: 'competitorResearchDone' },
    { id: 'overnight-market', messageKey: 'marketChangeConfirmed' },
    { id: 'overnight-interview', messageKey: 'interviewAnalysisDone' },
    { id: 'overnight-grant', messageKey: 'grantCheckDone' },
  ];
}

export function buildOvernightResearchWork(
  businessDeltas: Array<{ id: string; category: string }>,
  evidenceCount: number,
): DailyChangeItem[] {
  const fromDeltas = businessDeltas.slice(0, 2).map((delta): DailyChangeItem => {
    if (delta.category === 'competitor') {
      return { id: `overnight-${delta.id}`, messageKey: 'competitorPriceChecked' };
    }
    if (delta.category === 'government') {
      return { id: `overnight-${delta.id}`, messageKey: 'grantDiscovered' };
    }
    return { id: `overnight-${delta.id}`, messageKey: 'investmentTrendUpdate' };
  });

  const merged = [...fromDeltas];
  if (evidenceCount > 0) {
    merged.push({ id: 'overnight-evidence', messageKey: 'interviewSummaryDone' });
  }

  const defaults = defaultOvernightWork();
  while (merged.length < 4) {
    const next = defaults[merged.length];
    if (next && !merged.some((item) => item.messageKey === next.messageKey)) {
      merged.push(next);
    } else if (next) {
      merged.push({ ...next, id: `${next.id}-${merged.length}` });
    } else {
      break;
    }
  }

  return merged.slice(0, 4);
}

export function buildCeoApprovalQueue(
  todayActions: GeneratedTodayAction[],
  resolveTitle: (action: GeneratedTodayAction) => string,
): ApprovalQueueItem[] {
  return todayActions.slice(0, 3).map((action, index) => ({
    id: `approval-${action.id}`,
    actionId: action.id,
    title: resolveTitle(action),
    goImpact: action.goImpact,
    order: index + 1,
  }));
}

export function buildAiPmDailyReport(input: {
  behavior: FounderBehaviorProfile | null;
  scorePercent: number;
  dailyReview: FounderDailyReview;
  tomorrowFocus: string;
  goImpact: number;
}): DailyReportBrief {
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = (input.behavior?.actionHistory ?? []).filter(
    (entry) => entry.completedAt.slice(0, 10) === today,
  );

  const completedItems: DailyChangeItem[] =
    completedToday.length > 0
      ? completedToday.slice(0, 3).map((entry) => ({
          id: `completed-${entry.id}`,
          messageKey: entry.kind.includes('competitor')
            ? 'competitorAnalysisDone'
            : entry.kind.includes('pricing')
              ? 'pricingDraftDone'
              : entry.kind.includes('customer') || entry.kind.includes('voc')
                ? 'customerInterviewDone'
                : 'workCompleted',
          params: { title: entry.title },
        }))
      : [
          { id: 'completed-competitor', messageKey: 'competitorAnalysisDone' },
          { id: 'completed-interview', messageKey: 'customerInterviewDone' },
          { id: 'completed-pricing', messageKey: 'pricingDraftDone' },
        ];

  const scoreFrom = Math.max(0, input.scorePercent - (input.dailyReview.scoreDelta || input.goImpact));
  const scoreTo = input.scorePercent;
  const showReport =
    completedToday.length > 0 || input.dailyReview.scoreDelta > 0 || input.behavior?.visitCount !== 1;

  return {
    completedItems,
    scoreFrom,
    scoreTo,
    tomorrowFocus: input.tomorrowFocus,
    showReport,
  };
}

export function buildBusinessTimeline(
  stageIndex: number,
  progress: BusinessProgressDimension[],
): BusinessTimelineMilestone[] {
  const milestones: Array<{ id: string; labelKey: string; threshold: number }> = [
    { id: 'idea', labelKey: 'ideaRegistered', threshold: 0 },
    { id: 'market', labelKey: 'marketResearchDone', threshold: 1 },
    { id: 'competitor', labelKey: 'competitorAnalysis', threshold: 1 },
    { id: 'interview', labelKey: 'firstCustomerInterview', threshold: 2 },
    { id: 'pricing', labelKey: 'pricingValidation', threshold: 2 },
    { id: 'mvp', labelKey: 'mvp', threshold: 3 },
    { id: 'investment', labelKey: 'investmentPrep', threshold: 4 },
  ];

  const progressScore = Math.round(
    progress.reduce((sum, item) => sum + item.percent, 0) / Math.max(progress.length, 1),
  );
  const effectiveStage = Math.max(stageIndex, Math.floor(progressScore / 25));

  return milestones.map((milestone, index) => {
    if (index < effectiveStage) {
      return { id: milestone.id, labelKey: milestone.labelKey, status: 'done' as const };
    }
    if (index === effectiveStage) {
      return { id: milestone.id, labelKey: milestone.labelKey, status: 'current' as const };
    }
    return { id: milestone.id, labelKey: milestone.labelKey, status: 'upcoming' as const };
  });
}

export function buildAiPmMemoryBrief(input: {
  behavior: FounderBehaviorProfile | null;
  memoryAction: MemoryGeneratedAction;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): AiPmMemoryBrief {
  const { behavior, memoryAction, todayActions } = input;
  const gapKey = behavior?.currentGapKey ?? memoryAction.recall.lastWeekGapKey;
  const recommended = todayActions[0];
  const recommendedTitle = recommended ? input.resolveTitle(recommended) : '가격 검증';

  if (behavior && hasRepeatedDeferral(behavior, gapKey) && gapKey.includes('voc')) {
    return {
      show: true,
      messageKey: 'interviewDeferRecall',
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  if (
    behavior &&
    hasRepeatedDeferral(behavior, gapKey) &&
    (gapKey.includes('pricing') || gapKey.includes('Pricing'))
  ) {
    return {
      show: true,
      messageKey: 'pricingDeferRecall',
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  if (behavior && hasRepeatedDeferral(behavior, gapKey)) {
    return {
      show: true,
      messageKey: 'deferredRecall',
      params: { gap: gapKey },
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  if (behavior && behavior.visitCount > 1) {
    return {
      show: true,
      messageKey: 'patternRecall',
      params: {
        focus: memoryAction.recall.thisWeekFocusKey,
      },
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  return {
    show: false,
    messageKey: 'patternRecall',
    recommendedTitle,
  };
}
