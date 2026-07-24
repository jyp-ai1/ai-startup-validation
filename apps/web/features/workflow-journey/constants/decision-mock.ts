import type { WorkflowGoalId } from '../types';

export type DecisionVerdict = 'GO' | 'HOLD' | 'NO GO';

export type StrategyCoachState = {
  verdict: DecisionVerdict;
  confidence: number;
  confidenceAfterAction: number;
  projectHealth: number;
  whyReasonKeys: string[];
  nextActionStepId: string;
  nextActionDurationMinutes: number;
};

/** Mock decision coach state — no LLM (Epic 1 Sprint 2). */
const COACH_BY_GOAL: Record<WorkflowGoalId, StrategyCoachState> = {
  'business-viability': {
    verdict: 'HOLD',
    confidence: 42,
    confidenceAfterAction: 68,
    projectHealth: 68,
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews', 'marketSizeUnknown'],
    nextActionStepId: 'market',
    nextActionDurationMinutes: 4,
  },
  'new-business': {
    verdict: 'HOLD',
    confidence: 38,
    confidenceAfterAction: 61,
    projectHealth: 64,
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews', 'marketSizeUnknown'],
    nextActionStepId: 'context',
    nextActionDurationMinutes: 5,
  },
  'mvp-development': {
    verdict: 'HOLD',
    confidence: 45,
    confidenceAfterAction: 70,
    projectHealth: 71,
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews', 'marketSizeUnknown'],
    nextActionStepId: 'context',
    nextActionDurationMinutes: 3,
  },
  'investment-prep': {
    verdict: 'HOLD',
    confidence: 40,
    confidenceAfterAction: 65,
    projectHealth: 66,
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews', 'marketSizeUnknown'],
    nextActionStepId: 'market',
    nextActionDurationMinutes: 6,
  },
  'market-research': {
    verdict: 'HOLD',
    confidence: 44,
    confidenceAfterAction: 72,
    projectHealth: 70,
    whyReasonKeys: ['noCompetitorAnalysis', 'insufficientInterviews', 'marketSizeUnknown'],
    nextActionStepId: 'market',
    nextActionDurationMinutes: 4,
  },
};

export function getStrategyCoachState(goalId: WorkflowGoalId): StrategyCoachState {
  return COACH_BY_GOAL[goalId];
}

export function getConfidenceDelta(state: StrategyCoachState): number {
  return state.confidenceAfterAction - state.confidence;
}
