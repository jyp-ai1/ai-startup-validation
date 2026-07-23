import type { ProjectType } from '@repo/types/validation';

import type { AgentId, TaskNode } from './orchestrator-types';

type PlanTemplate = {
  agentId: AgentId;
  labelKey: string;
  dependsOn: AgentId[];
  parallelGroup: number;
};

const STARTUP: PlanTemplate[] = [
  { agentId: 'MARKET', labelKey: 'agents.market', dependsOn: [], parallelGroup: 1 },
  { agentId: 'COMPETITOR', labelKey: 'agents.competitor', dependsOn: ['MARKET'], parallelGroup: 2 },
  { agentId: 'VOC', labelKey: 'agents.voc', dependsOn: ['MARKET'], parallelGroup: 2 },
  { agentId: 'GOVERNMENT', labelKey: 'agents.government', dependsOn: ['MARKET'], parallelGroup: 2 },
  { agentId: 'FRAMEWORK', labelKey: 'agents.framework', dependsOn: ['COMPETITOR', 'VOC'], parallelGroup: 3 },
  { agentId: 'DECISION', labelKey: 'agents.decision', dependsOn: ['FRAMEWORK', 'GOVERNMENT'], parallelGroup: 4 },
];

const ENTERPRISE: PlanTemplate[] = [
  { agentId: 'MARKET', labelKey: 'agents.market', dependsOn: [], parallelGroup: 1 },
  { agentId: 'COMPETITOR', labelKey: 'agents.competitor', dependsOn: ['MARKET'], parallelGroup: 2 },
  { agentId: 'FRAMEWORK', labelKey: 'agents.framework', dependsOn: ['MARKET', 'COMPETITOR'], parallelGroup: 3 },
  { agentId: 'GOVERNMENT', labelKey: 'agents.government', dependsOn: ['MARKET'], parallelGroup: 2 },
  { agentId: 'DECISION', labelKey: 'agents.decision', dependsOn: ['FRAMEWORK', 'GOVERNMENT'], parallelGroup: 4 },
];

const AI: PlanTemplate[] = [
  { agentId: 'TECHNOLOGY', labelKey: 'agents.technology', dependsOn: [], parallelGroup: 1 },
  { agentId: 'MARKET', labelKey: 'agents.market', dependsOn: [], parallelGroup: 1 },
  { agentId: 'INVESTMENT', labelKey: 'agents.investment', dependsOn: ['MARKET', 'TECHNOLOGY'], parallelGroup: 2 },
  { agentId: 'FRAMEWORK', labelKey: 'agents.framework', dependsOn: ['INVESTMENT'], parallelGroup: 3 },
  { agentId: 'DECISION', labelKey: 'agents.decision', dependsOn: ['FRAMEWORK'], parallelGroup: 4 },
];

const DEFAULT: PlanTemplate[] = [
  { agentId: 'RESEARCH', labelKey: 'agents.research', dependsOn: [], parallelGroup: 1 },
  { agentId: 'MARKET', labelKey: 'agents.market', dependsOn: ['RESEARCH'], parallelGroup: 2 },
  { agentId: 'COMPETITOR', labelKey: 'agents.competitor', dependsOn: ['MARKET'], parallelGroup: 3 },
  { agentId: 'FRAMEWORK', labelKey: 'agents.framework', dependsOn: ['COMPETITOR'], parallelGroup: 4 },
  { agentId: 'DECISION', labelKey: 'agents.decision', dependsOn: ['FRAMEWORK'], parallelGroup: 5 },
];

function selectTemplate(projectType: ProjectType): PlanTemplate[] {
  switch (projectType) {
    case 'STARTUP':
      return STARTUP;
    case 'BUSINESS_STRATEGY':
    case 'NEW_BUSINESS':
    case 'DIGITAL_TRANSFORMATION':
    case 'MARKET_EXPANSION':
      return ENTERPRISE;
    case 'AI_INITIATIVE':
      return AI;
    default:
      return DEFAULT;
  }
}

/** Strategy Planner — builds dependency task tree from project type. */
export function buildExecutionPlanNodes(projectType: ProjectType): TaskNode[] {
  const template = selectTemplate(projectType);
  const idByAgent = new Map<AgentId, string>();

  for (const t of template) {
    idByAgent.set(t.agentId, `node-${t.agentId.toLowerCase()}`);
  }

  return template.map((t) => ({
    id: idByAgent.get(t.agentId)!,
    agentId: t.agentId,
    labelKey: t.labelKey,
    status: 'PLANNING' as const,
    dependsOn: t.dependsOn.map((dep) => idByAgent.get(dep)!),
    parallelGroup: t.parallelGroup,
    result: null,
    retryCount: 0,
    maxRetries: 3,
    cost: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  }));
}
