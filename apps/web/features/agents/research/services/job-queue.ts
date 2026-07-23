import type { AgentWorkflowState, ResearchJob } from './research-agent-types';
import { getNextState } from './state-machine';
import { isQueueProcessing, knowledgeStore, setQueueProcessing } from '../repositories/mock-knowledge-store';

const queue: Array<{ jobId: string; processor: () => Promise<void> }> = [];

/** Async job queue — ready for long-running Browser/MCP workers. */
export async function enqueueJob(jobId: string, processor: () => Promise<void>): Promise<void> {
  queue.push({ jobId, processor });
  await drainQueue();
}

async function drainQueue(): Promise<void> {
  if (isQueueProcessing()) return;
  setQueueProcessing(true);
  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) await item.processor();
    }
  } finally {
    setQueueProcessing(false);
  }
}

export async function transitionJob(
  job: ResearchJob,
  nextState: AgentWorkflowState,
): Promise<ResearchJob> {
  const updated: ResearchJob = {
    ...job,
    state: nextState,
    stateHistory: [...job.stateHistory, { state: nextState, at: new Date().toISOString() }],
  };
  await knowledgeStore.updateJob(updated);
  return updated;
}

export async function advanceJobThroughPipeline(
  job: ResearchJob,
  onStep?: (job: ResearchJob) => Promise<void>,
): Promise<ResearchJob> {
  let current = job;
  let next = getNextState(current.state);

  while (next) {
    current = await transitionJob(current, next);
    if (onStep) await onStep(current);
    if (next === 'ANALYZING') break;
    next = getNextState(current.state);
  }

  return current;
}
