import type { DecisionVerdict } from './decision-mock';
import type { WorkflowGoalId } from '../types';

export type ConfidenceTimelineStep = {
  id: string;
  gain: number;
  from: number;
  to: number;
  labelKey: string;
};

export type HealthBreakdown = {
  market: number;
  execution: number;
  finance: number;
  customer: number;
};

export type DecisionHistoryEntry = {
  id: string;
  eventKey: string;
  verdict?: DecisionVerdict;
};

export type ConfidenceBreakdownItem = {
  categoryKey: 'market' | 'competition' | 'customer' | 'revenue' | 'risk';
  delta: number;
};

export type EvidenceThoughtStep = {
  id: string;
  categoryKey: 'market' | 'competition' | 'customer' | 'revenue' | 'risk' | 'verdict';
  status: 'done' | 'current' | 'pending';
};

export type WhatIfScenario = {
  id: string;
  actionKey: string;
  labelKey: string;
  confidenceBefore: number;
  confidenceAfter: number;
  goProbabilityAfter: number;
};

export type DecisionStage = {
  verdict: DecisionVerdict;
  confidence: number;
  projectHealth: number;
  nextActionStepId: string;
  nextActionDurationMinutes: number;
  /** Primary HOLD reason shown above the fold (3-second clarity) */
  primaryHoldReasonKey?: string;
  whyReasonKeys: string[];
  historyCount: number;
  mockActionKey: string;
};

const CONFIDENCE_BREAKDOWN_BY_STAGE: ConfidenceBreakdownItem[][] = [
  [
    { categoryKey: 'market', delta: 12 },
    { categoryKey: 'competition', delta: 0 },
    { categoryKey: 'customer', delta: 8 },
    { categoryKey: 'revenue', delta: 2 },
    { categoryKey: 'risk', delta: -19 },
  ],
  [
    { categoryKey: 'market', delta: 20 },
    { categoryKey: 'competition', delta: 8 },
    { categoryKey: 'customer', delta: 10 },
    { categoryKey: 'revenue', delta: 5 },
    { categoryKey: 'risk', delta: -13 },
  ],
  [
    { categoryKey: 'market', delta: 20 },
    { categoryKey: 'competition', delta: 18 },
    { categoryKey: 'customer', delta: 10 },
    { categoryKey: 'revenue', delta: 5 },
    { categoryKey: 'risk', delta: -13 },
  ],
  [
    { categoryKey: 'market', delta: 20 },
    { categoryKey: 'competition', delta: 18 },
    { categoryKey: 'customer', delta: 18 },
    { categoryKey: 'revenue', delta: 8 },
    { categoryKey: 'risk', delta: -8 },
  ],
];

const EVIDENCE_CATEGORIES: EvidenceThoughtStep['categoryKey'][] = [
  'market',
  'competition',
  'customer',
  'revenue',
  'risk',
  'verdict',
];

export function getStageConfidenceBreakdown(stageIndex: number): ConfidenceBreakdownItem[] {
  return CONFIDENCE_BREAKDOWN_BY_STAGE[stageIndex] ?? CONFIDENCE_BREAKDOWN_BY_STAGE[2]!;
}

export function getEvidenceThoughtSteps(
  stageIndex: number,
  verdict: DecisionVerdict,
): EvidenceThoughtStep[] {
  const progressIndex = verdict === 'GO' ? EVIDENCE_CATEGORIES.length : stageIndex + 1;
  return EVIDENCE_CATEGORIES.map((categoryKey, index) => ({
    id: categoryKey,
    categoryKey,
    status:
      index < progressIndex - 1 ? 'done' : index === progressIndex - 1 ? 'current' : 'pending',
  }));
}

export function getStageWhatIf(
  stageIndex: number,
  currentConfidence: number,
): WhatIfScenario | null {
  if (stageIndex === 2) {
    return {
      id: 'what-if-voc-3',
      actionKey: 'addVoc3',
      labelKey: 'vocThree',
      confidenceBefore: currentConfidence,
      confidenceAfter: 81,
      goProbabilityAfter: 78,
    };
  }
  if (stageIndex === 1) {
    return {
      id: 'what-if-voc-2',
      actionKey: 'addVoc2',
      labelKey: 'vocTwo',
      confidenceBefore: currentConfidence,
      confidenceAfter: 68,
      goProbabilityAfter: 55,
    };
  }
  if (stageIndex === 0) {
    return {
      id: 'what-if-market',
      actionKey: 'completeMarket',
      labelKey: 'marketSize',
      confidenceBefore: currentConfidence,
      confidenceAfter: 50,
      goProbabilityAfter: 38,
    };
  }
  return null;
}

export const CONFIDENCE_TIMELINE: ConfidenceTimelineStep[] = [
  { id: 'market', labelKey: 'marketAnalysis', gain: 8, from: 42, to: 50 },
  { id: 'competitor', labelKey: 'competitorAnalysis', gain: 10, from: 50, to: 68 },
  { id: 'voc', labelKey: 'vocInterviews', gain: 8, from: 68, to: 81 },
];

export const HEALTH_BREAKDOWN: HealthBreakdown = {
  market: 92,
  execution: 48,
  finance: 73,
  customer: 81,
};

export const DECISION_HISTORY: DecisionHistoryEntry[] = [
  { id: 'h1', eventKey: 'startedHold', verdict: 'HOLD' },
  { id: 'h2', eventKey: 'marketResearchDone' },
  { id: 'h3', eventKey: 'competitorDone' },
  { id: 'h4', eventKey: 'movedToGo', verdict: 'GO' },
];

const BASE_STAGES: DecisionStage[] = [
  {
    verdict: 'HOLD',
    confidence: 42,
    projectHealth: 72,
    nextActionStepId: 'market',
    nextActionDurationMinutes: 4,
    primaryHoldReasonKey: 'marketSizeUnknown',
    whyReasonKeys: ['marketSizeUnknown', 'noCompetitorAnalysis', 'insufficientInterviews'],
    historyCount: 1,
    mockActionKey: 'completeMarket',
  },
  {
    verdict: 'HOLD',
    confidence: 50,
    projectHealth: 76,
    nextActionStepId: 'competition',
    nextActionDurationMinutes: 6,
    primaryHoldReasonKey: 'noCompetitorAnalysis',
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews'],
    historyCount: 2,
    mockActionKey: 'completeCompetitor',
  },
  {
    verdict: 'HOLD',
    confidence: 68,
    projectHealth: 80,
    nextActionStepId: 'evidence',
    nextActionDurationMinutes: 15,
    primaryHoldReasonKey: 'insufficientInterviews',
    whyReasonKeys: ['insufficientInterviews'],
    historyCount: 3,
    mockActionKey: 'completeVoc',
  },
  {
    verdict: 'GO',
    confidence: 81,
    projectHealth: 85,
    nextActionStepId: 'decision',
    nextActionDurationMinutes: 5,
    whyReasonKeys: [],
    historyCount: 4,
    mockActionKey: 'done',
  },
];

export function getDecisionStages(_goalId: WorkflowGoalId): DecisionStage[] {
  return BASE_STAGES;
}

export function getInitialStage(goalId: WorkflowGoalId): DecisionStage {
  return getDecisionStages(goalId)[0]!;
}

export const CONFIDENCE_GAINS_PREVIEW = [
  { labelKey: 'marketAnalysis', gain: 8 },
  { labelKey: 'competitorAnalysis', gain: 12 },
  { labelKey: 'vocInterviews', gain: 15 },
];
