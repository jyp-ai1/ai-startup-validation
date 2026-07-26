/** Founder-facing AI PM conversation — single personality, internal agents hidden. */

export type AiPmWorkItemId =
  | 'ideaUnderstood'
  | 'marketResearch'
  | 'competitorAnalysis'
  | 'strategyWriting'
  | 'todayPlan';

export type AiPmWorkItem = {
  id: AiPmWorkItemId;
  status: 'done' | 'running' | 'waiting' | 'failed';
};

const PIPELINE_WORK_ORDER: Exclude<AiPmWorkItemId, 'ideaUnderstood'>[] = [
  'marketResearch',
  'competitorAnalysis',
  'strategyWriting',
  'todayPlan',
];

export function buildAiPmWorkItems(agentIndex: number, failed = false): AiPmWorkItem[] {
  const pipelineItems = PIPELINE_WORK_ORDER.map((id, index) => {
    if (index < agentIndex) return { id, status: 'done' as const };
    if (index === agentIndex) {
      return { id, status: failed ? ('failed' as const) : ('running' as const) };
    }
    return { id, status: 'waiting' as const };
  });

  return [{ id: 'ideaUnderstood', status: 'done' }, ...pipelineItems];
}

export function getRunningWorkItemId(agentIndex: number): AiPmWorkItemId | null {
  if (agentIndex < 0 || agentIndex >= PIPELINE_WORK_ORDER.length) return null;
  return PIPELINE_WORK_ORDER[agentIndex] ?? null;
}

export function getStepEtaSeconds(workId: AiPmWorkItemId): number {
  const index = PIPELINE_WORK_ORDER.indexOf(workId as (typeof PIPELINE_WORK_ORDER)[number]);
  if (index < 0) return 0;
  return Math.max(1, (PIPELINE_WORK_ORDER.length - index) * 2);
}

export function estimateRemainingSeconds(agentIndex: number): number {
  const remaining = Math.max(0, PIPELINE_WORK_ORDER.length - agentIndex);
  return Math.max(3, remaining * 2);
}

export function getAiPmConversationMessageKey(agentIndex: number, failed = false): string {
  if (failed) return 'conversation.retry';
  if (agentIndex <= 0) return 'conversation.confirmedIdea';
  if (agentIndex === 1) return 'conversation.afterMarket';
  if (agentIndex === 2) return 'conversation.competitorAnalysis';
  if (agentIndex === 3) return 'conversation.strategyWriting';
  return 'conversation.preparingToday';
}

export function getMicroQuestionId(agentIndex: number): 'targetCustomer' | null {
  if (agentIndex === 0 || agentIndex === 1) return 'targetCustomer';
  return null;
}

export function getAiPmPreparedItemKeys(agentIndex: number): string[] {
  const keys: string[] = [];
  if (agentIndex >= 1) keys.push('marketDone');
  if (agentIndex >= 2) keys.push('competitorDone');
  if (agentIndex >= 3) keys.push('viabilityDone');
  if (agentIndex >= 4) keys.push('todayReady');
  return keys;
}

export const AI_PM_WORK_COUNT = PIPELINE_WORK_ORDER.length;
