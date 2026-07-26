import type { AiPmWorkItemId } from './ai-pm-conversation';
import { getRunningWorkItemId } from './ai-pm-conversation';

/** i18n keys under workflow.aiPm.liveStream.{workId}.{n} */
export function getLiveStreamMessageKeys(agentIndex: number): string[] {
  const workId = getRunningWorkItemId(agentIndex);
  if (!workId) return ['confirmedIdea'];

  const counts: Record<Exclude<AiPmWorkItemId, 'ideaUnderstood'>, number> = {
    marketResearch: 4,
    competitorAnalysis: 3,
    strategyWriting: 3,
    todayPlan: 3,
  };

  const count = counts[workId as keyof typeof counts] ?? 2;
  return Array.from({ length: count }, (_, index) => `${workId}.${index + 1}`);
}

export const LIVE_STREAM_INTERVAL_MS = 2000;
