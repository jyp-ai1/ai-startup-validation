'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { buildCompetitiveIntelligence } from '../../lib/founder-competitive-intelligence';
import { buildExplainableJudgment } from '../../lib/founder-explainable-judgment';
import {
  computeFounderIntelligenceBrief,
  type GeneratedTodayAction,
} from '../../lib/founder-intelligence-engine';
import { buildExplainableScoreFactors } from '../../lib/founder-personalization-engine';
import {
  buildStrategyDashboardData,
  type StrategyDashboardData,
} from '../../lib/founder-strategy-dashboard';
import type { WorkflowGoalId } from '../../types';
import { FounderStrategyDashboard } from './founder-strategy-dashboard';

type FounderStrategyDashboardLoaderProps = {
  projectId: string;
  projectName: string;
  goalId: WorkflowGoalId;
  confidence: number;
  todayActions?: GeneratedTodayAction[];
  compact?: boolean;
  onStartAction?: (actionId: string) => void;
  className?: string;
};

export function FounderStrategyDashboardLoader({
  projectId,
  projectName,
  goalId,
  confidence,
  todayActions: todayActionsOverride,
  compact = false,
  onStartAction,
  className,
}: FounderStrategyDashboardLoaderProps) {
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const tDaily = useTranslations('workflow.founderAiPm.dailyCeo');

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, confidence),
    [confidence, goalId, projectId],
  );

  const pipeline = useMemo(() => loadAgentPipelineResult(), [projectId]);
  const todayActions = todayActionsOverride ?? intelligence.todayActions;

  const data = useMemo((): StrategyDashboardData => {
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

    return buildStrategyDashboardData({
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
    <FounderStrategyDashboard
      data={data}
      compact={compact}
      onStartAction={onStartAction}
      className={className}
    />
  );
}

export { buildStrategyDashboardData, type StrategyDashboardData };
