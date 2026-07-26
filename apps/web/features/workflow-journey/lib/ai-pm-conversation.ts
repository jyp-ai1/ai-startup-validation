/** Founder-facing AI PM conversation — single personality, internal agents hidden. */

export type AiPmWorkItemId =
  | 'marketResearch'
  | 'strategyPlan'
  | 'profitability'
  | 'decisionReview'
  | 'todayPlan';

export type AiPmWorkItem = {
  id: AiPmWorkItemId;
  status: 'done' | 'running' | 'waiting' | 'failed';
  progress?: number;
};

const WORK_ORDER: AiPmWorkItemId[] = [
  'marketResearch',
  'strategyPlan',
  'profitability',
  'decisionReview',
  'todayPlan',
];

export function buildAiPmWorkItems(agentIndex: number, failed = false): AiPmWorkItem[] {
  return WORK_ORDER.map((id, index) => {
    if (index < agentIndex) return { id, status: 'done' };
    if (index === agentIndex) {
      return { id, status: failed ? 'failed' : 'running', progress: failed ? 0 : 62 };
    }
    return { id, status: 'waiting' };
  });
}

export function estimateRemainingSeconds(agentIndex: number): number {
  const remaining = Math.max(0, WORK_ORDER.length - agentIndex);
  return Math.max(3, remaining * 2);
}

export function getAiPmConversationMessageKey(agentIndex: number, failed = false): string {
  if (failed) return 'conversation.retry';
  if (agentIndex <= 0) return 'conversation.startResearch';
  if (agentIndex === 1) return 'conversation.afterMarket';
  if (agentIndex === 2) return 'conversation.profitability';
  if (agentIndex === 3) return 'conversation.decisionReview';
  if (agentIndex >= 4) return 'conversation.preparingToday';
  return 'conversation.complete';
}

export function getAiPmPreparedItemKeys(agentIndex: number): string[] {
  const keys: string[] = [];
  if (agentIndex >= 1) keys.push('marketDone');
  if (agentIndex >= 2) keys.push('competitorDone');
  if (agentIndex >= 3) keys.push('viabilityDone');
  if (agentIndex >= 4) keys.push('todayReady');
  return keys;
}

export const AI_PM_WORK_COUNT = WORK_ORDER.length;
