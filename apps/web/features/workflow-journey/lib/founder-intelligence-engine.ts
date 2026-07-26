import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { getDecisionStages } from '../constants/decision-experience';
import type { WorkflowGoalId } from '../types';
import {
  computeFounderOperatingBrief,
  resolveStageIndex,
  type FounderOperatingBrief,
} from './founder-ai-pm-engine';
import {
  buildMemoryGeneratedAction,
  syncFounderMemoryOnVisit,
  type FounderMemoryRecall,
  type MemoryGeneratedAction,
} from './founder-memory-store';
import {
  loadFounderBehavior,
  syncFounderBehaviorOnVisit,
  type FounderActionRecord,
  type FounderBehaviorProfile,
} from './founder-behavior-store';
import { loadProjectRegistration } from '../components/project-registration-panel';
import {
  buildExplainableScoreFactors,
  buildPersonalizedAiPmBrief,
  buildPersonalizedMorningLines,
  buildWeeklyCeoReview,
  type PersonalizedAiPmBrief,
  type SuccessScoreFactor,
  type WeeklyCeoReview,
} from './founder-personalization-engine';
import { loadFounderMicroAnswers } from './founder-micro-interaction-store';

export type FounderSuccessScore = {
  percent: number;
  delta: number;
  reasonKeys: string[];
  reasons?: string[];
};

export type BusinessProgressDimension = {
  key: 'market' | 'customer' | 'pricing' | 'investment';
  percent: number;
};

export type GeneratedTodayAction = {
  id: string;
  title?: string;
  titleKey?: string;
  titleParams?: Record<string, string | number>;
  whyText?: string;
  etaMinutes: number;
  goImpact: number;
  order: number;
};

export type BusinessDeltaJudgment = {
  id: string;
  category: 'market' | 'competitor' | 'investment' | 'government';
  changeKey?: string;
  changeParams?: Record<string, string | number>;
  changeText?: string;
  recommendationKey?: string;
  recommendationText?: string;
  reasonKey?: string;
  reasonText?: string;
  goImpact: number;
};

export type FounderDailyReview = {
  scoreDelta: number;
  advanceKeys: string[];
  pendingKeys: string[];
  advances?: string[];
  pending?: string[];
  tomorrowFocusKey: string;
  tomorrowFocus?: string;
  totalMinutesInvested: number;
};

export type BusinessDeltaItem = BusinessDeltaJudgment;

export type DecisionIntelligencePath = {
  whyKey: string;
  whyParams: Record<string, string | number>;
  whyText?: string;
  howKey: string;
  howParams: Record<string, string | number>;
  howText?: string;
  whenKey: string;
  whenParams: Record<string, string | number>;
  confidenceFrom: number;
  confidenceTo: number;
  goFrom: number;
  goTo: number;
  etaDays: number;
};

export type ExecutionRoadmapItem = {
  horizon: 'today' | 'week' | 'month' | 'quarter' | 'investment';
  title: string;
  etaMinutes: number;
  confidenceImpact: number;
  completionCriteriaKey: string;
};

export type GrowthPathItem = {
  id: string;
  phaseKey: string;
  title: string;
  etaWeeks: number;
  status: 'current' | 'upcoming' | 'done';
};

export type FounderIntelligenceBrief = {
  operating: FounderOperatingBrief;
  memoryRecall: FounderMemoryRecall;
  memoryAction: MemoryGeneratedAction;
  morningBrief?: string;
  successScore: FounderSuccessScore;
  successScoreFactors: SuccessScoreFactor[];
  personalized: PersonalizedAiPmBrief;
  personalizedMorningLines: string[];
  weeklyCeoReview: WeeklyCeoReview;
  behavior: FounderBehaviorProfile | null;
  businessProgress: BusinessProgressDimension[];
  todayActions: GeneratedTodayAction[];
  totalEtaMinutes: number;
  businessDeltas: BusinessDeltaJudgment[];
  decisionPath: DecisionIntelligencePath;
  executionRoadmap: ExecutionRoadmapItem[];
  growthPath: GrowthPathItem[];
  dailyReview: FounderDailyReview;
  showGrowth: boolean;
  fromAgentPipeline: boolean;
};

const WHY_KEYS = ['marketGap', 'competitorGap', 'vocGap', 'goReady'] as const;
const HOW_KEYS = ['marketResearch', 'competitorDeepDive', 'pricingInterview', 'mvpLaunch'] as const;
const WHEN_DAYS = [7, 10, 14, 21] as const;

const PROGRESS_BY_STAGE: BusinessProgressDimension[][] = [
  [
    { key: 'market', percent: 30 },
    { key: 'customer', percent: 15 },
    { key: 'pricing', percent: 0 },
    { key: 'investment', percent: 5 },
  ],
  [
    { key: 'market', percent: 70 },
    { key: 'customer', percent: 35 },
    { key: 'pricing', percent: 8 },
    { key: 'investment', percent: 12 },
  ],
  [
    { key: 'market', percent: 82 },
    { key: 'customer', percent: 41 },
    { key: 'pricing', percent: 63 },
    { key: 'investment', percent: 18 },
  ],
  [
    { key: 'market', percent: 95 },
    { key: 'customer', percent: 72 },
    { key: 'pricing', percent: 78 },
    { key: 'investment', percent: 35 },
  ],
];

const SUCCESS_REASONS_BY_STAGE = [
  ['marketEvidence', 'competitorScan'],
  ['marketValidated', 'competitorMatrix'],
  ['vocStarted', 'pricingHypothesis', 'competitorDone'],
  ['vocComplete', 'pricingStrategy', 'goPathOpen'],
] as const;

function mapPipelineMemoryAction(
  pipeline: NonNullable<ReturnType<typeof loadAgentPipelineResult>>,
  recall: FounderMemoryRecall,
  gapKey: string,
): MemoryGeneratedAction {
  const agentAction = pipeline.memory.generatedAction;
  if (agentAction) {
    return {
      recall,
      actionTitleKey: 'pipelineAction',
      questionKeys: agentAction.questions.map((_, i) => `p${i + 1}`),
      etaMinutes: agentAction.etaMinutes,
      pipelineAction: agentAction,
    };
  }
  return buildMemoryGeneratedAction(recall, gapKey);
}

type FounderIntelligenceCore = Omit<
  FounderIntelligenceBrief,
  'successScoreFactors' | 'personalized' | 'personalizedMorningLines' | 'weeklyCeoReview' | 'behavior'
>;

function boostProgressFromActions(
  progress: BusinessProgressDimension[],
  history: FounderActionRecord[],
): BusinessProgressDimension[] {
  const completedKinds = new Set(history.map((entry) => entry.kind));

  return progress.map((dim) => {
    let boost = 0;
    if (dim.key === 'customer' && completedKinds.has('interview')) boost = 25;
    if (dim.key === 'pricing' && completedKinds.has('pricing')) boost = 30;
    if (dim.key === 'market' && completedKinds.has('competitor')) boost = 15;
    if (dim.key === 'customer' && completedKinds.has('landing')) boost = 10;
    return { ...dim, percent: Math.min(100, dim.percent + boost) };
  });
}

function attachPersonalization(
  brief: FounderIntelligenceCore,
  projectId: string,
  goalId: WorkflowGoalId,
  gapKey: string,
  stageIndex: number,
  confidence: number,
): FounderIntelligenceBrief {
  const registration = loadProjectRegistration();
  const micro = loadFounderMicroAnswers();
  const behavior = syncFounderBehaviorOnVisit(projectId, gapKey, brief.successScore.percent, {
    ideaSummary: registration?.ideaOneLiner,
    goalLabel: goalId,
    targetCustomer: micro.targetCustomer,
  });

  const profile = loadFounderBehavior(projectId) ?? behavior;
  const actionBonus = profile.actionScoreBonus;
  const latestSnapshot = profile.scoreSnapshots[profile.scoreSnapshots.length - 1];
  const adjustedPercent = Math.min(
    100,
    Math.max(brief.successScore.percent + actionBonus, latestSnapshot?.score ?? 0),
  );
  const businessProgress = boostProgressFromActions(
    brief.businessProgress,
    profile.actionHistory,
  );

  const reasonKeys =
    brief.successScore.reasonKeys.length > 0
      ? brief.successScore.reasonKeys
      : [...(SUCCESS_REASONS_BY_STAGE[stageIndex] ?? SUCCESS_REASONS_BY_STAGE[2]!)];
  const successScoreFactors = buildExplainableScoreFactors(businessProgress, reasonKeys);
  const primaryAction = brief.todayActions[0];
  const personalized = buildPersonalizedAiPmBrief(
    { ...brief, businessProgress, successScore: { ...brief.successScore, percent: adjustedPercent } },
    profile,
    goalId,
    primaryAction,
  );
  const personalizedMorningLines = buildPersonalizedMorningLines(personalized, brief.morningBrief);
  const weeklyCeoReview = buildWeeklyCeoReview(brief, profile);

  return {
    ...brief,
    businessProgress,
    successScore: {
      ...brief.successScore,
      percent: adjustedPercent,
    },
    successScoreFactors,
    personalized,
    personalizedMorningLines,
    weeklyCeoReview,
    behavior: profile,
  };
}

function buildFromAgentPipeline(
  pipeline: NonNullable<ReturnType<typeof loadAgentPipelineResult>>,
  projectId: string,
  goalId: WorkflowGoalId,
  confidence: number,
  operating: FounderOperatingBrief,
  memoryRecall: FounderMemoryRecall,
  gapKey: string,
  stageIndex: number,
): FounderIntelligenceBrief {
  const os = pipeline.founderOs;
  const decisionIntel = pipeline.decision.intelligence;
  const stages = getDecisionStages(goalId);
  const stage = stages[stageIndex] ?? stages[0]!;
  const gain = stageIndex === 2 ? 13 : 10;
  const goGain = stageIndex === 2 ? 22 : 15;

  const memoryAction = mapPipelineMemoryAction(pipeline, memoryRecall, gapKey);

  if (os) {
    return attachPersonalization(
      {
      operating,
      memoryRecall,
      memoryAction,
      morningBrief: os.morningBrief,
      successScore: {
        percent: os.successScore.percent,
        delta: os.successScore.delta,
        reasonKeys: [],
        reasons: os.successScore.reasons,
      },
      businessProgress: os.businessProgress,
      todayActions: os.todayActions.map((a, index) => ({
        id: a.id,
        title: a.title,
        whyText:
          index === 0
            ? (decisionIntel?.gap ?? pipeline.decision.missingData[0] ?? decisionIntel?.why)
            : undefined,
        etaMinutes: a.etaMinutes,
        goImpact: a.goImpact,
        order: a.order,
      })),
      totalEtaMinutes: os.totalEtaMinutes,
      businessDeltas: os.businessDeltas.map((d) => ({
        id: d.id,
        category: d.category,
        changeText: d.change,
        recommendationText: d.recommendation,
        reasonText: d.reason,
        goImpact: d.goImpact,
      })),
      decisionPath: {
        whyKey: WHY_KEYS[stageIndex] ?? 'vocGap',
        whyParams: {
          verdict: pipeline.decision.verdict,
          gap: pipeline.decision.missingData[0] ?? stage.primaryHoldReasonKey ?? 'voc',
        },
        whyText: decisionIntel?.why,
        howKey: HOW_KEYS[stageIndex] ?? 'pricingInterview',
        howParams: { action: stage.nextActionStepId },
        howText: decisionIntel?.how,
        whenKey: stageIndex >= 3 ? 'goNow' : 'beforeGo',
        whenParams: { days: WHEN_DAYS[stageIndex] ?? 14 },
        confidenceFrom: confidence,
        confidenceTo: Math.min(100, confidence + gain),
        goFrom: confidence,
        goTo: Math.min(100, confidence + goGain),
        etaDays: WHEN_DAYS[stageIndex] ?? 14,
      },
      executionRoadmap: buildExecutionRoadmap(stageIndex, pipeline),
      growthPath: buildGrowthPath(stageIndex, pipeline),
      dailyReview: {
        scoreDelta: os.dailyReview.scoreDelta,
        advanceKeys: [],
        pendingKeys: [],
        advances: os.dailyReview.advances,
        pending: os.dailyReview.pending,
        tomorrowFocusKey: 'pipeline',
        tomorrowFocus: os.dailyReview.tomorrowFocus,
        totalMinutesInvested: os.dailyReview.totalMinutesInvested,
      },
      showGrowth: stageIndex >= 2 || pipeline.decision.verdict === 'GO',
      fromAgentPipeline: true,
    },
      projectId,
      goalId,
      gapKey,
      stageIndex,
      confidence,
    );
  }

  return attachPersonalization(
    buildFallbackBrief(
    goalId,
    confidence,
    operating,
    memoryRecall,
    gapKey,
    stageIndex,
    pipeline,
    true,
  ),
    projectId,
    goalId,
    gapKey,
    stageIndex,
    confidence,
  );
}

function buildExecutionRoadmap(
  stageIndex: number,
  pipeline?: ReturnType<typeof loadAgentPipelineResult>,
): ExecutionRoadmapItem[] {
  const horizonMap: Record<string, ExecutionRoadmapItem['horizon']> = {
    today: 'today',
    week: 'week',
    month: 'month',
  };

  const fromPipeline =
    pipeline?.execution?.tasks.map((task) => ({
      horizon: horizonMap[task.horizon] ?? 'week',
      title: task.title,
      etaMinutes: task.etaMinutes,
      confidenceImpact: task.confidenceImpact,
      completionCriteriaKey: task.priority === 'P0' ? 'evidenceLogged' : 'reviewComplete',
    })) ?? [];

  const quarter: ExecutionRoadmapItem = {
    horizon: 'quarter',
    title:
      stageIndex >= 3
        ? 'Beta launch + first paying customers'
        : 'GO decision + MVP scope lock',
    etaMinutes: 2400,
    confidenceImpact: 18,
    completionCriteriaKey: 'milestoneComplete',
  };

  const investment: ExecutionRoadmapItem = {
    horizon: 'investment',
    title: 'Seed deck + IR narrative from validated metrics',
    etaMinutes: 3600,
    confidenceImpact: 12,
    completionCriteriaKey: 'investorReady',
  };

  return [...fromPipeline, quarter, investment];
}

function buildGrowthPath(
  stageIndex: number,
  pipeline?: ReturnType<typeof loadAgentPipelineResult>,
): GrowthPathItem[] {
  const milestones = pipeline?.growth?.milestones ?? [];
  const titles =
    milestones.length > 0
      ? milestones.map((m) => ({ phase: m.phase, title: m.title, etaWeeks: m.etaWeeks }))
      : [
          { phase: 'mvp' as const, title: 'MVP scope lock + build', etaWeeks: 2 },
          { phase: 'interview' as const, title: '10 ICP customer interviews', etaWeeks: 3 },
          { phase: 'landing' as const, title: 'Landing + waitlist launch', etaWeeks: 4 },
          { phase: 'marketing' as const, title: 'Founder community GTM', etaWeeks: 5 },
          { phase: 'funding' as const, title: 'Seed round preparation', etaWeeks: 8 },
        ];

  return titles.map((item, index) => ({
    id: `growth-${index}`,
    phaseKey: item.phase,
    title: item.title,
    etaWeeks: item.etaWeeks,
    status: index < stageIndex - 1 ? 'done' : index === stageIndex - 1 ? 'current' : 'upcoming',
  }));
}

function buildFallbackBrief(
  goalId: WorkflowGoalId,
  confidence: number,
  operating: FounderOperatingBrief,
  memoryRecall: FounderMemoryRecall,
  gapKey: string,
  stageIndex: number,
  pipeline: ReturnType<typeof loadAgentPipelineResult>,
  fromAgentPipeline: boolean,
): FounderIntelligenceCore {
  const stages = getDecisionStages(goalId);
  const stage = stages[stageIndex] ?? stages[0]!;
  const gain = stageIndex === 2 ? 13 : 10;
  const goGain = stageIndex === 2 ? 22 : 15;

  const todayActions: GeneratedTodayAction[] = [
    {
      id: 'action-1',
      titleKey: stageIndex === 2 ? 'vocInterview' : 'primaryStep',
      titleParams: { step: operating.daily.actionKey, count: operating.daily.actionCount },
      etaMinutes: operating.daily.etaMinutes,
      goImpact: operating.daily.goProbabilityGain,
      order: 1,
    },
    {
      id: 'action-2',
      titleKey: HOW_KEYS[stageIndex] ?? 'pricingInterview',
      etaMinutes: Math.max(10, Math.round(operating.daily.etaMinutes * 0.6)),
      goImpact: Math.max(2, Math.round(operating.daily.goProbabilityGain * 0.4)),
      order: 2,
    },
    {
      id: 'action-3',
      titleKey: 'pipelineTask',
      titleParams: pipeline?.execution?.tasks[0]
        ? { title: pipeline.execution.tasks[0].title }
        : undefined,
      etaMinutes: pipeline?.execution?.tasks[0]?.etaMinutes ?? 8,
      goImpact: pipeline?.execution?.tasks[0]?.confidenceImpact ?? 2,
      order: 3,
    },
  ];

  const totalEtaMinutes = todayActions.reduce((sum, a) => sum + a.etaMinutes, 0);

  return {
    operating,
    memoryRecall,
    memoryAction: buildMemoryGeneratedAction(memoryRecall, gapKey),
    successScore: {
      percent: confidence,
      delta: 3,
      reasonKeys: [...(SUCCESS_REASONS_BY_STAGE[stageIndex] ?? SUCCESS_REASONS_BY_STAGE[2]!)],
    },
    businessProgress: PROGRESS_BY_STAGE[stageIndex] ?? PROGRESS_BY_STAGE[2]!,
    todayActions,
    totalEtaMinutes,
    businessDeltas: [],
    decisionPath: {
      whyKey: WHY_KEYS[stageIndex] ?? 'vocGap',
      whyParams: {
        verdict: pipeline?.decision?.verdict ?? stage.verdict,
        gap: pipeline?.decision?.missingData?.[0] ?? stage.primaryHoldReasonKey ?? 'voc',
      },
      howKey: HOW_KEYS[stageIndex] ?? 'pricingInterview',
      howParams: { action: stage.nextActionStepId },
      whenKey: stageIndex >= 3 ? 'goNow' : 'beforeGo',
      whenParams: { days: WHEN_DAYS[stageIndex] ?? 14 },
      confidenceFrom: confidence,
      confidenceTo: Math.min(100, confidence + gain),
      goFrom: confidence,
      goTo: Math.min(100, confidence + goGain),
      etaDays: WHEN_DAYS[stageIndex] ?? 14,
    },
    executionRoadmap: buildExecutionRoadmap(stageIndex, pipeline),
    growthPath: buildGrowthPath(stageIndex, pipeline),
    dailyReview: {
      scoreDelta: 3,
      advanceKeys: ['marketScanStarted'],
      pendingKeys: ['vocPrep'],
      tomorrowFocusKey: 'pricingValidation',
      totalMinutesInvested: totalEtaMinutes,
    },
    showGrowth: stageIndex >= 2 || pipeline?.decision?.verdict === 'GO',
    fromAgentPipeline,
  };
}

export function computeFounderIntelligenceBrief(
  projectId: string,
  goalId: WorkflowGoalId,
  confidence: number,
): FounderIntelligenceBrief {
  const stageIndex = resolveStageIndex(confidence);
  const operating = computeFounderOperatingBrief(goalId, confidence);
  const memoryRecall = syncFounderMemoryOnVisit(projectId, stageIndex, confidence);
  const gapKey = ['marketGap', 'competitorGap', 'vocGap', 'goReady'][stageIndex] ?? 'vocGap';
  const pipeline = loadAgentPipelineResult();

  if (pipeline?.founderOs || pipeline?.decision) {
    return buildFromAgentPipeline(
      pipeline,
      projectId,
      goalId,
      confidence,
      operating,
      memoryRecall,
      gapKey,
      stageIndex,
    );
  }

  return attachPersonalization(
    buildFallbackBrief(
      goalId,
      confidence,
      operating,
      memoryRecall,
      gapKey,
      stageIndex,
      pipeline,
      false,
    ),
    projectId,
    goalId,
    gapKey,
    stageIndex,
    confidence,
  );
}
