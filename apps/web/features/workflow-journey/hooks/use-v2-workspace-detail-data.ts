'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { loadAgentPipelineResult } from '@/lib/agents/agent-run-store';

import { buildCompetitiveIntelligence } from '../lib/founder-competitive-intelligence';
import { buildDailyCeoHabitBrief } from '../lib/founder-daily-ceo-habit';
import { buildExplainableJudgment } from '../lib/founder-explainable-judgment';
import {
  buildExecutiveDecisionBoardData,
  type ExecutiveDecisionBoardData,
} from '../lib/founder-executive-decision-board';
import {
  computeFounderIntelligenceBrief,
  type GeneratedTodayAction,
} from '../lib/founder-intelligence-engine';
import { buildExplainableScoreFactors } from '../lib/founder-personalization-engine';
import { enrichProjectForHome } from '../lib/v2-workspace-home';
import type { DailyCeoHabitBrief } from '../lib/founder-daily-ceo-habit';
import type { MockProject } from '@/features/project-intelligence/constants/mock-projects';
import type { WorkflowGoalId } from '../types';

export function useV2WorkspaceDetailData(
  project: MockProject,
  projectId: string,
  goalId: WorkflowGoalId,
) {
  const td = useTranslations('workflow.founderAiPm.intelligence.actionGenerator');
  const tDaily = useTranslations('workflow.founderAiPm.dailyCeo');

  const intelligence = useMemo(
    () => computeFounderIntelligenceBrief(projectId, goalId, project.confidence),
    [goalId, project.confidence, projectId],
  );

  const pipeline = useMemo(() => loadAgentPipelineResult(), [projectId]);

  const resolveTitle = (action: GeneratedTodayAction) =>
    action.title ??
    (action.titleKey ? td(action.titleKey, action.titleParams) : tDaily('approvalQueue.fallbackAction'));

  const habitBrief = useMemo(
    (): DailyCeoHabitBrief =>
      buildDailyCeoHabitBrief({
        projectId,
        behavior: intelligence.behavior,
        businessDeltas: intelligence.businessDeltas,
        todayActions: intelligence.todayActions,
        resolveTitle,
      }),
    [intelligence.behavior, intelligence.businessDeltas, intelligence.todayActions, projectId, td, tDaily],
  );

  const decisionData = useMemo((): ExecutiveDecisionBoardData => {
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
      projectName: project.name,
      scorePercent: intelligence.successScore.percent,
      businessProgress: intelligence.businessProgress,
      explainableJudgment,
      competitiveIntelligence,
      pipeline,
      behavior: intelligence.behavior,
      todayActions: intelligence.todayActions,
      resolveTitle,
    });
  }, [intelligence, pipeline, project.name, td, tDaily]);

  const homeCard = useMemo(() => enrichProjectForHome(project), [project]);

  return {
    intelligence,
    habitBrief,
    decisionData,
    homeCard,
    todayAction: habitBrief.todayFocus,
  };
}
