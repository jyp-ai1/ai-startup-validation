import type { FounderBehaviorProfile } from './founder-behavior-store';
import { hasRepeatedDeferral } from './founder-behavior-store';
import type {
  BusinessProgressDimension,
  FounderDailyReview,
  GeneratedTodayAction,
} from './founder-intelligence-engine';
import type { WeeklyCeoReview } from './founder-personalization-engine';

export type LivingHistoryEntry = {
  id: string;
  isToday?: boolean;
  month: number;
  day: number;
  messageKey: string;
  params?: Record<string, string | number>;
  subtitleKey?: string;
  subtitleParams?: Record<string, string | number>;
  status: 'done' | 'current';
};

export type LivingWeeklyStory = {
  progressMessageKeys: string[];
  nextWeekMessageKey: string;
  nextWeekParams?: Record<string, string | number>;
};

export type LivingStuckAlert = {
  show: boolean;
  daysStuck: number;
  areaMessageKey: string;
  recommendedTitle: string;
  recommendedActionId?: string;
};

export type LivingMomentum = {
  storyMessageKey: string;
  percent: number;
  filledSegments: number;
};

export type LivingDailyJournal = {
  show: boolean;
  month: number;
  day: number;
  founderMessageKey: string;
  founderParams?: Record<string, string | number>;
  aiPmMessageKey: string;
  aiPmParams?: Record<string, string | number>;
  scoreMessageKey?: string;
  scoreParams?: Record<string, string | number>;
};

export type LivingMilestoneCelebration = {
  show: boolean;
  messageKey: string;
  params?: Record<string, string | number>;
};

export type LivingFounderPattern = {
  show: boolean;
  messageKey: string;
  params?: Record<string, string | number>;
  recommendedActionId?: string;
  recommendedTitle: string;
};

export type LivingMorningContext = {
  weeklyProgressKey?: string;
  weeklyProgressParams?: Record<string, string | number>;
  stuckWarningKey?: string;
  stuckWarningParams?: Record<string, string | number>;
};

export type LivingProjectBrief = {
  history: LivingHistoryEntry[];
  weeklyStory: LivingWeeklyStory;
  stuckAlert: LivingStuckAlert;
  momentum: LivingMomentum;
  dailyJournal: LivingDailyJournal;
  milestoneCelebration: LivingMilestoneCelebration;
  founderPattern: LivingFounderPattern;
  morningContext: LivingMorningContext;
};

function dateParts(isoOrDate: string | Date): { month: number; day: number } {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return { month: date.getMonth() + 1, day: date.getDate() };
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return Math.max(1, Math.floor((now - then) / (1000 * 60 * 60 * 24)));
}

function progressPercent(progress: BusinessProgressDimension[], key: string): number {
  return progress.find((item) => item.key === key)?.percent ?? 0;
}

function resolveCurrentHistoryKey(
  gapKey: string | undefined,
  progress: BusinessProgressDimension[],
): string {
  if (gapKey?.includes('pricing') || progressPercent(progress, 'pricing') < 40) {
    return 'pricingInProgress';
  }
  if (gapKey?.includes('voc') || progressPercent(progress, 'customer') < 50) {
    return 'customerValidationInProgress';
  }
  if (gapKey?.includes('mvp')) {
    return 'mvpInProgress';
  }
  if (progressPercent(progress, 'market') < 60) {
    return 'marketValidationInProgress';
  }
  return 'investmentPrepInProgress';
}

export function buildLivingProjectHistory(input: {
  behavior: FounderBehaviorProfile | null;
  progress: BusinessProgressDimension[];
  stageIndex: number;
}): LivingHistoryEntry[] {
  const now = new Date();
  const firstVisit = new Date(input.behavior?.firstVisitAt ?? now);
  const entries: LivingHistoryEntry[] = [];

  entries.push({
    id: 'history-created',
    ...dateParts(firstVisit),
    messageKey: 'projectCreated',
    status: 'done',
  });

  const marketPercent = progressPercent(input.progress, 'market');
  const customerPercent = progressPercent(input.progress, 'customer');
  const pricingPercent = progressPercent(input.progress, 'pricing');
  const history = input.behavior?.actionHistory ?? [];

  if (marketPercent >= 35 || input.stageIndex >= 1) {
    entries.push({
      id: 'history-market',
      ...dateParts(addDays(firstVisit, 2)),
      messageKey: 'marketResearchDone',
      status: 'done',
    });
  }

  const competitorAction = history.find((entry) => entry.kind.includes('competitor'));
  if (marketPercent >= 45 || competitorAction || input.stageIndex >= 1) {
    entries.push({
      id: 'history-competitor',
      ...dateParts(competitorAction ? new Date(competitorAction.completedAt) : addDays(firstVisit, 5)),
      messageKey: 'aiPmCompetitorResearch',
      params: { count: 12 },
      subtitleKey: 'aiPmByline',
      status: 'done',
    });
  }

  const interviewAction = history.find(
    (entry) =>
      entry.kind.includes('interview') ||
      entry.kind.includes('voc') ||
      entry.kind.includes('customer'),
  );
  if (interviewAction || customerPercent >= 25) {
    entries.push({
      id: 'history-interview',
      ...dateParts(interviewAction ? new Date(interviewAction.completedAt) : addDays(firstVisit, 7)),
      messageKey: 'firstInterviewDone',
      status: 'done',
    });
  }

  if (pricingPercent >= 20) {
    entries.push({
      id: 'history-pricing',
      ...dateParts(addDays(firstVisit, 10)),
      messageKey: 'pricingStarted',
      status: 'done',
    });
  }

  entries.push({
    id: 'history-today',
    isToday: true,
    ...dateParts(now),
    messageKey: resolveCurrentHistoryKey(input.behavior?.currentGapKey, input.progress),
    status: 'current',
  });

  return entries;
}

export function buildLivingWeeklyStory(input: {
  progress: BusinessProgressDimension[];
  weeklyReview: WeeklyCeoReview;
  behavior: FounderBehaviorProfile | null;
}): LivingWeeklyStory {
  const market = progressPercent(input.progress, 'market');
  const customer = progressPercent(input.progress, 'customer');
  const pricing = progressPercent(input.progress, 'pricing');

  const progressMessageKeys: string[] = [];
  if (market >= 55) progressMessageKeys.push('marketAdvanced');
  if (customer >= 20 && customer < 55) progressMessageKeys.push('customerStarted');
  if (customer >= 55) progressMessageKeys.push('customerAdvanced');
  if (progressMessageKeys.length === 0) progressMessageKeys.push('steadyWeek');

  let nextWeekMessageKey = 'pricingFocus';
  let nextWeekParams: Record<string, string | number> | undefined;
  if (pricing < 35) {
    nextWeekMessageKey = 'pricingFocus';
  } else if (customer < 50) {
    nextWeekMessageKey = 'customerFocus';
  } else if (market < 70) {
    nextWeekMessageKey = 'marketFocus';
  } else {
    nextWeekMessageKey = 'mvpFocus';
  }

  if (input.weeklyReview.nextWeekPriority) {
    nextWeekParams = { focus: input.weeklyReview.nextWeekPriority };
  }

  return { progressMessageKeys, nextWeekMessageKey, nextWeekParams };
}

export function detectLivingStuck(input: {
  behavior: FounderBehaviorProfile | null;
  progress: BusinessProgressDimension[];
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): LivingStuckAlert {
  const empty: LivingStuckAlert = {
    show: false,
    daysStuck: 0,
    areaMessageKey: 'genericStuck',
    recommendedTitle: input.todayActions[0]
      ? input.resolveTitle(input.todayActions[0])
      : '가격 인터뷰 3명',
  };

  const { behavior } = input;
  if (!behavior) return empty;

  const gapKey = behavior.currentGapKey;
  const pricingPercent = progressPercent(input.progress, 'pricing');
  const customerPercent = progressPercent(input.progress, 'customer');

  let daysStuck = behavior.gapWeeksUnchanged * 7;
  if (daysStuck === 0 && hasRepeatedDeferral(behavior, gapKey)) {
    daysStuck = 5;
  }

  const lastAction = behavior.actionHistory[0];
  if (lastAction) {
    const idleDays = daysSince(lastAction.completedAt);
    if (idleDays >= 5 && behavior.gapWeeksUnchanged >= 1) {
      daysStuck = Math.max(daysStuck, idleDays);
    }
  }

  let areaMessageKey = 'genericStuck';
  if (gapKey.includes('pricing') || (pricingPercent < 25 && behavior.gapWeeksUnchanged >= 1)) {
    areaMessageKey = 'pricingStuck';
    daysStuck = Math.max(daysStuck, 7);
  } else if (
    gapKey.includes('voc') ||
    gapKey.includes('customer') ||
    (customerPercent < 35 && hasRepeatedDeferral(behavior, gapKey))
  ) {
    areaMessageKey = 'interviewStuck';
    daysStuck = Math.max(daysStuck, 5);
  } else if (gapKey.includes('mvp')) {
    areaMessageKey = 'mvpStuck';
    daysStuck = Math.max(daysStuck, 5);
  }

  if (daysStuck < 5) return empty;

  const recommended = input.todayActions[0];
  return {
    show: true,
    daysStuck,
    areaMessageKey,
    recommendedTitle: recommended ? input.resolveTitle(recommended) : empty.recommendedTitle,
    recommendedActionId: recommended?.id,
  };
}

export function buildLivingMomentum(input: {
  progress: BusinessProgressDimension[];
  behavior: FounderBehaviorProfile | null;
}): LivingMomentum {
  const avg = Math.round(
    input.progress.reduce((sum, item) => sum + item.percent, 0) /
      Math.max(input.progress.length, 1),
  );
  const snapshots = input.behavior?.scoreSnapshots ?? [];
  const weekBoost =
    snapshots.length >= 2
      ? Math.max(0, snapshots[snapshots.length - 1]!.score - snapshots[0]!.score)
      : 0;
  const percent = Math.min(100, Math.round(avg * 0.7 + weekBoost * 0.3));

  let storyMessageKey = 'steadyWeek';
  if (percent >= 78) storyMessageKey = 'fastWeek';
  else if (percent >= 58) storyMessageKey = 'goodWeek';

  return {
    storyMessageKey,
    percent,
    filledSegments: Math.round(percent / 10),
  };
}

export function buildLivingDailyJournal(input: {
  behavior: FounderBehaviorProfile | null;
  dailyReview: FounderDailyReview;
  scorePercent: number;
}): LivingDailyJournal {
  const today = new Date().toISOString().slice(0, 10);
  const completedToday =
    input.behavior?.actionHistory.filter((entry) => entry.completedAt.slice(0, 10) === today) ??
    [];

  const founderMessageKey =
    completedToday.length > 0 ? 'founderCompletedAction' : 'founderReviewedBrief';
  const founderParams =
    completedToday.length > 0 ? { action: completedToday[0]!.title } : undefined;

  const scoreMessageKey =
    input.dailyReview.scoreDelta > 0
      ? 'viabilityRose'
      : input.scorePercent >= 60
        ? 'viabilityStable'
        : undefined;

  return {
    show: true,
    ...dateParts(new Date()),
    founderMessageKey,
    founderParams,
    aiPmMessageKey: 'aiPmProposedStrategy',
    scoreMessageKey,
    scoreParams: scoreMessageKey ? { delta: input.dailyReview.scoreDelta || 2 } : undefined,
  };
}

export function buildLivingMilestoneCelebration(
  behavior: FounderBehaviorProfile | null,
): LivingMilestoneCelebration {
  const recent = behavior?.actionHistory[0];
  if (!recent) return { show: false, messageKey: '' };

  const hoursSince = (Date.now() - new Date(recent.completedAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince > 72) return { show: false, messageKey: '' };

  if (recent.kind.includes('interview') || recent.kind.includes('voc') || recent.kind.includes('customer')) {
    const isFirst =
      (behavior?.actionHistory.filter(
        (entry) =>
          entry.kind.includes('interview') ||
          entry.kind.includes('voc') ||
          entry.kind.includes('customer'),
      ).length ?? 0) <= 1;
    return {
      show: true,
      messageKey: isFirst ? 'firstInterview' : 'interviewMilestone',
    };
  }

  if (recent.kind.includes('pricing')) {
    return { show: true, messageKey: 'pricingMilestone' };
  }

  if (recent.kind.includes('competitor')) {
    return { show: true, messageKey: 'marketValidationDone' };
  }

  return { show: false, messageKey: '' };
}

export function buildLivingFounderPattern(input: {
  behavior: FounderBehaviorProfile | null;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): LivingFounderPattern {
  const recommended = input.todayActions[0];
  const recommendedTitle = recommended
    ? input.resolveTitle(recommended)
    : '가격 인터뷰 3명';

  if (!input.behavior || input.behavior.visitCount < 2) {
    return { show: false, messageKey: '', recommendedTitle };
  }

  const deferred = input.behavior.deferredGapKeys;
  if (deferred.some((gap) => gap.includes('pricing'))) {
    return {
      show: true,
      messageKey: 'marketFastPricingSlow',
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  if (deferred.some((gap) => gap.includes('voc') || gap.includes('customer'))) {
    return {
      show: true,
      messageKey: 'interviewDeferPattern',
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  const afternoonCount = input.behavior.actionHistory.filter(
    (entry) => new Date(entry.completedAt).getHours() >= 14,
  ).length;
  if (afternoonCount >= 2) {
    return {
      show: true,
      messageKey: 'afternoonInterviewPattern',
      recommendedActionId: recommended?.id,
      recommendedTitle,
    };
  }

  return { show: false, messageKey: '', recommendedTitle };
}

export function buildLivingMorningContext(input: {
  weeklyStory: LivingWeeklyStory;
  stuckAlert: LivingStuckAlert;
  progress: BusinessProgressDimension[];
}): LivingMorningContext {
  const market = progressPercent(input.progress, 'market');
  const pricing = progressPercent(input.progress, 'pricing');

  let weeklyProgressKey: string | undefined;
  if (input.weeklyStory.progressMessageKeys.includes('marketAdvanced')) {
    weeklyProgressKey = 'weekMarketAdvanced';
  } else if (input.weeklyStory.progressMessageKeys.includes('customerStarted')) {
    weeklyProgressKey = 'weekCustomerStarted';
  }

  let stuckWarningKey: string | undefined;
  let stuckWarningParams: Record<string, string | number> | undefined;
  if (input.stuckAlert.show) {
    if (input.stuckAlert.areaMessageKey === 'pricingStuck' || pricing < 30) {
      stuckWarningKey = 'pricingPaused';
      stuckWarningParams = { days: input.stuckAlert.daysStuck };
    } else {
      stuckWarningKey = 'areaPaused';
      stuckWarningParams = { days: input.stuckAlert.daysStuck };
    }
  } else if (market >= 60 && pricing < 25) {
    stuckWarningKey = 'pricingPaused';
    stuckWarningParams = { days: 6 };
  }

  return { weeklyProgressKey, weeklyProgressParams: undefined, stuckWarningKey, stuckWarningParams };
}

export function buildLivingProjectBrief(input: {
  projectId: string;
  behavior: FounderBehaviorProfile | null;
  progress: BusinessProgressDimension[];
  stageIndex: number;
  weeklyReview: WeeklyCeoReview;
  dailyReview: FounderDailyReview;
  scorePercent: number;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
}): LivingProjectBrief {
  const history = buildLivingProjectHistory({
    behavior: input.behavior,
    progress: input.progress,
    stageIndex: input.stageIndex,
  });
  const weeklyStory = buildLivingWeeklyStory({
    progress: input.progress,
    weeklyReview: input.weeklyReview,
    behavior: input.behavior,
  });
  const stuckAlert = detectLivingStuck({
    behavior: input.behavior,
    progress: input.progress,
    todayActions: input.todayActions,
    resolveTitle: input.resolveTitle,
  });
  const momentum = buildLivingMomentum({
    progress: input.progress,
    behavior: input.behavior,
  });
  const dailyJournal = buildLivingDailyJournal({
    behavior: input.behavior,
    dailyReview: input.dailyReview,
    scorePercent: input.scorePercent,
  });
  const milestoneCelebration = buildLivingMilestoneCelebration(input.behavior);
  const founderPattern = buildLivingFounderPattern({
    behavior: input.behavior,
    todayActions: input.todayActions,
    resolveTitle: input.resolveTitle,
  });
  const morningContext = buildLivingMorningContext({
    weeklyStory,
    stuckAlert,
    progress: input.progress,
  });

  return {
    history,
    weeklyStory,
    stuckAlert,
    momentum,
    dailyJournal,
    milestoneCelebration,
    founderPattern,
    morningContext,
  };
}
