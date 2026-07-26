'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { saveAgentPipelineResult } from '@/lib/agents/agent-run-store';
import { getPreviousSuccessScore, syncLearningFromPipeline } from '@/lib/agents/learning-store';
import { runStrategyPipeline } from '@/lib/agents/run-strategy-pipeline';

import { AI_PM_WORK_COUNT } from '../lib/ai-pm-conversation';
import { loadProjectRegistration, type ProjectRegistrationData } from '../components/project-registration-panel';
import type { WorkflowGoalId } from '../types';

const PIPELINE_AGENT_INTERVAL_MS = 2200;

type UseV2ResearchPipelineOptions = {
  goalId: WorkflowGoalId;
  projectId: string;
  enabled: boolean;
  onComplete: () => void;
  onFailed: () => void;
};

export function useV2ResearchPipeline({
  goalId,
  projectId,
  enabled,
  onComplete,
  onFailed,
}: UseV2ResearchPipelineOptions) {
  const [agentIndex, setAgentIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const onCompleteRef = useRef(onComplete);
  const onFailedRef = useRef(onFailed);
  onCompleteRef.current = onComplete;
  onFailedRef.current = onFailed;

  const runAnalysis = useCallback(() => {
    const reg: ProjectRegistrationData | null = loadProjectRegistration();
    if (!reg) {
      setFailed(true);
      onFailedRef.current();
      return undefined;
    }

    setFailed(false);
    setRunning(true);
    setAgentIndex(0);

    const agentTimer = window.setInterval(() => {
      setAgentIndex((prev) => Math.min(prev + 1, AI_PM_WORK_COUNT - 1));
    }, PIPELINE_AGENT_INTERVAL_MS);

    void runStrategyPipeline(
      {
        projectId,
        projectTitle: reg.projectName,
        ideaSummary: reg.ideaOneLiner ?? reg.projectName,
        goalId,
        locale: typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'ko',
        previousSuccessScore: getPreviousSuccessScore(projectId),
      },
      { maxAttempts: 2, timeoutMs: 45_000 },
    ).then((outcome) => {
      window.clearInterval(agentTimer);
      setRunning(false);
      if (outcome.ok) {
        saveAgentPipelineResult(outcome.data);
        const score =
          outcome.data.founderOs?.successScore.percent ??
          outcome.data.growth.metrics?.successScore ??
          0;
        syncLearningFromPipeline(projectId, outcome.data.learning, score);
        setAgentIndex(AI_PM_WORK_COUNT);
        onCompleteRef.current();
        return;
      }
      setFailed(true);
      onFailedRef.current();
    });

    return () => {
      window.clearInterval(agentTimer);
    };
  }, [goalId, projectId]);

  useEffect(() => {
    if (!enabled) return undefined;
    return runAnalysis();
  }, [enabled, runAnalysis]);

  return {
    agentIndex: Math.min(agentIndex, AI_PM_WORK_COUNT - 1),
    failed,
    running,
    retry: runAnalysis,
  };
}
