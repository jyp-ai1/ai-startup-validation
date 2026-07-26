import type { DecisionStage } from '../constants/decision-experience';
import {
  CONFIDENCE_TIMELINE,
  getDecisionStages,
  getEvidenceThoughtSteps,
  getStageConfidenceBreakdown,
  getStageWhatIf,
} from '../constants/decision-experience';
import type { WorkflowGoalId } from '../types';

/** Founder-facing AI PM brief — separate from Admin Product OS engine. */
export type FounderAiPmBrief = {
  summaryKey: string;
  summaryParams: Record<string, string | number>;
  confidenceBreakdown: ReturnType<typeof getStageConfidenceBreakdown>;
  evidenceThoughtSteps: ReturnType<typeof getEvidenceThoughtSteps>;
  whatIf: ReturnType<typeof getStageWhatIf>;
  nextAction: {
    durationMinutes: number;
    confidenceGain: number;
    goProbabilityGain: number;
    priority: 'P0' | 'P1' | 'P2';
  };
  todayFocus: string;
};

export type FounderDailyBrief = {
  actionKey: string;
  actionCount: number;
  goProbabilityGain: number;
  etaMinutes: number;
  confidenceCurrent: number;
  confidenceAfter: number;
};

export type FounderWeeklyPillar = {
  key: 'marketValidation' | 'competitorAnalysis' | 'pricingValidation';
  progress: number;
};

export type FounderWeeklyStrategy = {
  pillars: FounderWeeklyPillar[];
  recommendationKey: string;
};

export type FounderAiMemory = {
  insightKey: string;
};

export type FounderMentorNote = {
  contextKey: string;
  adviceKey: string;
};

export type StrategyCalendarHorizon = 'today' | 'thisWeek' | 'nextWeek' | 'roadmap';

export type StrategyCalendarItem = {
  horizon: StrategyCalendarHorizon;
  labelKey: string;
  status: 'current' | 'upcoming' | 'done';
};

/** Founder Project Operating System — daily → monthly horizon. */
export type FounderOperatingBrief = {
  stageIndex: number;
  decision: FounderAiPmBrief;
  daily: FounderDailyBrief;
  weekly: FounderWeeklyStrategy;
  memory: FounderAiMemory;
  mentor: FounderMentorNote;
  calendar: StrategyCalendarItem[];
};

const SUMMARY_KEYS: Record<string, string> = {
  marketSizeUnknown: 'marketGap',
  noCompetitorAnalysis: 'competitorGap',
  insufficientInterviews: 'vocGap',
  go: 'goReady',
};

const GO_PROBABILITY_GAINS = [12, 15, 24, 22] as const;

const WEEKLY_BY_STAGE: FounderWeeklyStrategy[] = [
  {
    pillars: [
      { key: 'marketValidation', progress: 30 },
      { key: 'competitorAnalysis', progress: 10 },
      { key: 'pricingValidation', progress: 0 },
    ],
    recommendationKey: 'marketResearch',
  },
  {
    pillars: [
      { key: 'marketValidation', progress: 70 },
      { key: 'competitorAnalysis', progress: 40 },
      { key: 'pricingValidation', progress: 0 },
    ],
    recommendationKey: 'competitorDeepDive',
  },
  {
    pillars: [
      { key: 'marketValidation', progress: 70 },
      { key: 'competitorAnalysis', progress: 100 },
      { key: 'pricingValidation', progress: 20 },
    ],
    recommendationKey: 'pricingInterview',
  },
  {
    pillars: [
      { key: 'marketValidation', progress: 100 },
      { key: 'competitorAnalysis', progress: 100 },
      { key: 'pricingValidation', progress: 60 },
    ],
    recommendationKey: 'launchPrep',
  },
];

const MEMORY_BY_STAGE: FounderAiMemory[] = [
  { insightKey: 'marketFirst' },
  { insightKey: 'competitorGap' },
  { insightKey: 'vocGapLastWeek' },
  { insightKey: 'goMomentum' },
];

const MENTOR_BY_STAGE: FounderMentorNote[] = [
  { contextKey: 'earlyStage', adviceKey: 'marketFirst' },
  { contextKey: 'competition', adviceKey: 'differentiate' },
  { contextKey: 'preInvestor', adviceKey: 'pricingBeforeInvestor' },
  { contextKey: 'postGo', adviceKey: 'executionFocus' },
];

const CALENDAR_BY_STAGE: StrategyCalendarItem[][] = [
  [
    { horizon: 'today', labelKey: 'marketSizing', status: 'current' },
    { horizon: 'thisWeek', labelKey: 'competitorScan', status: 'upcoming' },
    { horizon: 'nextWeek', labelKey: 'vocSprint', status: 'upcoming' },
    { horizon: 'roadmap', labelKey: 'goDecision', status: 'upcoming' },
  ],
  [
    { horizon: 'today', labelKey: 'competitorAnalysis', status: 'current' },
    { horizon: 'thisWeek', labelKey: 'vocSprint', status: 'upcoming' },
    { horizon: 'nextWeek', labelKey: 'pricingTest', status: 'upcoming' },
    { horizon: 'roadmap', labelKey: 'goDecision', status: 'upcoming' },
  ],
  [
    { horizon: 'today', labelKey: 'vocCollection', status: 'current' },
    { horizon: 'thisWeek', labelKey: 'goPath', status: 'current' },
    { horizon: 'nextWeek', labelKey: 'pricingTest', status: 'upcoming' },
    { horizon: 'roadmap', labelKey: 'mvpLaunch', status: 'upcoming' },
  ],
  [
    { horizon: 'today', labelKey: 'executionStart', status: 'current' },
    { horizon: 'thisWeek', labelKey: 'mvpScope', status: 'current' },
    { horizon: 'nextWeek', labelKey: 'betaLaunch', status: 'upcoming' },
    { horizon: 'roadmap', labelKey: 'growth', status: 'upcoming' },
  ],
];

export function resolveStageIndex(confidence: number): number {
  if (confidence >= 81) return 3;
  if (confidence >= 68) return 2;
  if (confidence >= 50) return 1;
  return 0;
}

export function computeFounderAiPmBrief(stage: DecisionStage, stageIndex: number): FounderAiPmBrief {
  const timelineStep = CONFIDENCE_TIMELINE[stageIndex];
  const confidenceGain = timelineStep?.gain ?? 0;
  const goProbabilityGain = GO_PROBABILITY_GAINS[stageIndex] ?? 0;
  const primaryKey = stage.primaryHoldReasonKey ?? 'go';
  const summaryKey = SUMMARY_KEYS[primaryKey] ?? 'vocGap';

  const nextConfidence =
    stageIndex < CONFIDENCE_TIMELINE.length
      ? CONFIDENCE_TIMELINE[stageIndex]?.to ?? stage.confidence
      : stage.confidence;

  return {
    summaryKey,
    summaryParams: {
      current: stage.confidence,
      after: nextConfidence,
      gain: confidenceGain,
      interviews: stageIndex === 2 ? 3 : 2,
    },
    confidenceBreakdown: getStageConfidenceBreakdown(stageIndex),
    evidenceThoughtSteps: getEvidenceThoughtSteps(stageIndex, stage.verdict),
    whatIf: getStageWhatIf(stageIndex, stage.confidence),
    nextAction: {
      durationMinutes: stage.nextActionDurationMinutes,
      confidenceGain,
      goProbabilityGain,
      priority: stageIndex === 2 ? 'P0' : stageIndex === 0 ? 'P1' : 'P1',
    },
    todayFocus: stage.nextActionStepId,
  };
}

export function computeFounderOperatingBrief(
  goalId: WorkflowGoalId,
  confidence: number,
): FounderOperatingBrief {
  const stageIndex = resolveStageIndex(confidence);
  const stages = getDecisionStages(goalId);
  const stage = stages[stageIndex] ?? stages[0]!;
  const decision = computeFounderAiPmBrief(stage, stageIndex);
  const timelineStep = CONFIDENCE_TIMELINE[stageIndex];

  const vocCount = stageIndex === 2 ? 2 : 1;
  const goGain = GO_PROBABILITY_GAINS[stageIndex] ?? 22;

  return {
    stageIndex,
    decision,
    daily: {
      actionKey: stageIndex === 2 ? 'voc' : stage.nextActionStepId,
      actionCount: vocCount,
      goProbabilityGain: goGain,
      etaMinutes: stage.nextActionDurationMinutes,
      confidenceCurrent: stage.confidence,
      confidenceAfter: timelineStep?.to ?? stage.confidence,
    },
    weekly: WEEKLY_BY_STAGE[stageIndex] ?? WEEKLY_BY_STAGE[2]!,
    memory: MEMORY_BY_STAGE[stageIndex] ?? MEMORY_BY_STAGE[2]!,
    mentor: MENTOR_BY_STAGE[stageIndex] ?? MENTOR_BY_STAGE[2]!,
    calendar: CALENDAR_BY_STAGE[stageIndex] ?? CALENDAR_BY_STAGE[2]!,
  };
}
