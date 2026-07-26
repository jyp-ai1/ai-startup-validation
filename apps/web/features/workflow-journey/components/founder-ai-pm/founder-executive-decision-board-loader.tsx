'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { buildCompetitiveIntelligence } from '../../lib/founder-competitive-intelligence';
import { buildExplainableJudgment } from '../../lib/founder-explainable-judgment';
import {
  buildExecutiveDecisionBoardData,
  type ExecutiveDecisionBoardData,
} from '../../lib/founder-executive-decision-board';
import {
  computeFounderIntelligenceBrief,
  type GeneratedTodayAction,
} from '../../lib/founder-intelligence-engine';
import { buildExplainableScoreFactors } from '../../lib/founder-personalization-engine';
import type { WorkflowGoalId } from '../../types';
import { FounderExecutiveDecisionBoard } from './founder-executive-decision-board';

type FounderExecutiveDecisionBoardLoaderProps = {
  projectId: string;
  projectName: string;
  goalId: WorkflowGoalId;
  confidence: number;
  todayActions?: GeneratedTodayAction[];
  compact?: boolean;
  onStartAction?: (actionId: string) => void;
  onApproveAction?: (actionId: string) => void;
  className?: string;
};

/** Loads pipeline + intelligence and renders the Executive Decision Board (right rail). */
export function FounderExecutiveDecisionBoardLoader({
  projectId,
  projectName,
  goalId,
  confidence,
  todayActions: todayActionsOverride,
  compact = false,
  onStartAction,
  onApproveAction,
  className,
}: FounderExecutiveDecisionBoardLoaderProps) {
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const tDaily = useTranslations('workflow.founderAiPm.dailyCeo');

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId],
  );

  const pipeline = useMemo(() => loadAgentPipelineResult(), [projectId]);
  const todayActions = todayActionsOverride ?? intelligence.todayActions;

  const data = useMemo((): ExecutiveDecisionBoardData => {
    const factors = buildExplainableScoreFactors(
      intelligence.businessProgress,
      pipeline?.decision.reasons ?? [],
    );
    const explainableJudgment = buildExplainableJudgment(
      pipeline,
      intelligence.successScore.percent,
      intelligence.businessProgress,
      factors,
    );
    const competitiveIntelligence = buildCompetitiveIntelligence(
      pipeline,
      intelligence.businessProgress,
    );

    return buildExecutiveDecisionBoardData({
      projectName,
      scorePercent: intelligence.successScore.percent,
      businessProgress: intelligence.businessProgress,
      explainableJudgment,
      competitiveIntelligence,
      pipeline,
      behavior: intelligence.behavior,
      todayActions,
      resolveTitle: (action) =>
        action.title ??
        (action.titleKey ? td(action.titleKey, action.titleParams) : tDaily('approvalQueue.fallbackAction')),
    });
  }, [intelligence, pipeline, projectName, td, tDaily, todayActions]);

  return (
    <FounderExecutiveDecisionBoard
      data={data}
      compact={compact}
      onStartAction={onStartAction}
      onApproveAction={onApproveAction}
      className={className}
    />
  );
}

export { buildExecutiveDecisionBoardData, type ExecutiveDecisionBoardData };
