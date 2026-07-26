/** AI State Communication — shared state machine for all Founder surfaces. */

export type AiState =
  | 'INPUT_REQUIRED'
  | 'AI_RUNNING'
  | 'WAITING'
  | 'DECISION_READY'
  | 'EXECUTION_READY'
  | 'WORKING'
  | 'COMPLETED';

export type PipelineMilestoneId =
  | 'ideaSaved'
  | 'marketResearch'
  | 'strategyGeneration'
  | 'investmentReview'
  | 'todayActions';

export type AgentRoleId =
  | 'marketResearcher'
  | 'strategyPlanner'
  | 'strategyConsultant'
  | 'investmentAdvisor'
  | 'executionPm';

export type AgentLiveStatus = 'done' | 'running' | 'waiting' | 'failed';

export type PipelineMilestone = {
  id: PipelineMilestoneId;
  status: AgentLiveStatus;
};

export type AgentLiveEntry = {
  id: AgentRoleId;
  status: AgentLiveStatus;
  progress?: number;
};

export type AiStateHeroContent = {
  state: AiState;
  founderAction: string;
  aiActivity: string;
  aiEtaSeconds?: number;
  aiProgress?: number;
  nextStep: string;
};

export type AiStateContext = {
  surface: 'registration' | 'pipeline' | 'today';
  pipelineFailed?: boolean;
  pipelineAgentIndex?: number;
  pipelineProgress?: number;
  hasPipelineResult?: boolean;
  primaryActionTitle?: string;
  primaryActionWhy?: string;
  primaryActionEta?: number;
  primaryActionGoImpact?: number;
  morningBrief?: string;
  ideaInputHint?: string;
};

const PIPELINE_AGENT_ORDER: AgentRoleId[] = [
  'marketResearcher',
  'strategyPlanner',
  'strategyConsultant',
  'investmentAdvisor',
  'executionPm',
];

export function buildPipelineMilestones(agentIndex: number, failed = false): PipelineMilestone[] {
  const ids: PipelineMilestoneId[] = [
    'ideaSaved',
    'marketResearch',
    'strategyGeneration',
    'investmentReview',
    'todayActions',
  ];

  return ids.map((id, index) => {
    if (index === 0) return { id, status: 'done' as const };

    const step = index;
    if (failed && agentIndex === step - 1) {
      return { id, status: 'failed' as const };
    }
    if (agentIndex >= step) return { id, status: 'done' as const };
    if (agentIndex === step - 1) return { id, status: 'running' as const };
    return { id, status: 'waiting' as const };
  });
}

export function buildAgentLiveTeam(agentIndex: number, failed = false): AgentLiveEntry[] {
  return PIPELINE_AGENT_ORDER.map((id, index) => {
    let status: AgentLiveStatus = 'waiting';
    let progress: number | undefined;

    if (index < agentIndex) status = 'done';
    else if (index === agentIndex) {
      status = failed ? 'failed' : 'running';
      progress = failed ? 0 : 55;
    }

    return { id, status, progress };
  });
}

export function resolveAiState(context: AiStateContext): AiState {
  if (context.surface === 'registration') return 'INPUT_REQUIRED';
  if (context.surface === 'pipeline') {
    if (context.pipelineFailed) return 'WAITING';
    if ((context.pipelineAgentIndex ?? 0) < 5) return 'AI_RUNNING';
    return 'DECISION_READY';
  }
  if (context.primaryActionTitle) return 'EXECUTION_READY';
  if (context.hasPipelineResult) return 'WORKING';
  return 'WAITING';
}

/** Hero copy keys — resolved in UI via i18n */
export type AiStateHeroKeys = {
  state: AiState;
  founderActionKey: string;
  founderActionParams?: Record<string, string | number>;
  aiActivityKey: string;
  aiActivityParams?: Record<string, string | number>;
  nextStepKey: string;
  nextStepParams?: Record<string, string | number>;
  aiEtaSeconds?: number;
  aiProgress?: number;
};

export function resolveAiStateHeroKeys(context: AiStateContext): AiStateHeroKeys {
  const state = resolveAiState(context);
  const agentIndex = context.pipelineAgentIndex ?? 0;
  const progress = context.pipelineProgress ?? Math.min(95, (agentIndex + 1) * 18);

  if (context.surface === 'registration') {
    return {
      state,
      founderActionKey: 'founder.enterIdea',
      nextStepKey: 'next.pipelineStarts',
      aiActivityKey: 'ai.waitingForInput',
      aiProgress: 0,
    };
  }

  if (context.surface === 'pipeline') {
    const agentId = PIPELINE_AGENT_ORDER[Math.min(agentIndex, PIPELINE_AGENT_ORDER.length - 1)]!;
    return {
      state,
      founderActionKey: 'founder.waitForAi',
      founderActionParams: { seconds: Math.max(3, 12 - agentIndex * 2) },
      aiActivityKey: `ai.agents.${agentId}`,
      nextStepKey: context.pipelineFailed ? 'next.retryPipeline' : 'next.todayActionsReady',
      aiEtaSeconds: Math.max(3, 12 - agentIndex * 2),
      aiProgress: progress,
    };
  }

  const action = context.primaryActionTitle ?? '';
  return {
    state,
    founderActionKey: action ? 'founder.doAction' : 'founder.reviewProgress',
    founderActionParams: action ? { action } : undefined,
    aiActivityKey: context.morningBrief ? 'ai.monitoring' : 'ai.ready',
    aiActivityParams: context.morningBrief
      ? { brief: context.morningBrief.slice(0, 80) }
      : undefined,
    nextStepKey: 'next.afterAction',
    nextStepParams: {
      go: context.primaryActionGoImpact ?? 8,
      minutes: context.primaryActionEta ?? 15,
    },
    aiProgress: context.hasPipelineResult ? 100 : 0,
  };
}

export const PIPELINE_AGENT_COUNT = PIPELINE_AGENT_ORDER.length;
