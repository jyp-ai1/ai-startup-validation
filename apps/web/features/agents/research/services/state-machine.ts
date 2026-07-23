import type { AgentWorkflowState } from './research-agent-types';

const TRANSITIONS: Record<AgentWorkflowState, AgentWorkflowState[]> = {
  QUEUED: ['RUNNING', 'FAILED'],
  RUNNING: ['SEARCHING', 'FAILED'],
  SEARCHING: ['EXTRACTING', 'FAILED'],
  EXTRACTING: ['ANALYZING', 'FAILED'],
  ANALYZING: ['COMPLETED', 'FAILED'],
  COMPLETED: [],
  FAILED: [],
};

/** Pipeline order for timeline UI. */
export const WORKFLOW_PIPELINE: AgentWorkflowState[] = [
  'QUEUED',
  'RUNNING',
  'SEARCHING',
  'EXTRACTING',
  'ANALYZING',
  'COMPLETED',
];

export function canTransition(from: AgentWorkflowState, to: AgentWorkflowState): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getNextState(current: AgentWorkflowState): AgentWorkflowState | null {
  const pipeline = WORKFLOW_PIPELINE;
  const idx = pipeline.indexOf(current);
  if (idx < 0 || idx >= pipeline.length - 1) return null;
  const next = pipeline[idx + 1]!;
  return canTransition(current, next) ? next : null;
}

export function isTerminalState(state: AgentWorkflowState): boolean {
  return state === 'COMPLETED' || state === 'FAILED';
}

export function isRunningState(state: AgentWorkflowState): boolean {
  return !isTerminalState(state) && state !== 'QUEUED';
}
