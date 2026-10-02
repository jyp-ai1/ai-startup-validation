/**
 * Real Business Review — full session trace schema (Production / logged-in).
 * Evidence filled by production-real-business-review-trace.mjs when auth available.
 */

export type RealBusinessReviewTurnTrace = {
  turn: number;
  userAnswer: string;
  aiUnderstanding: Record<string, unknown>;
  knowledgeState: Record<string, unknown>;
  gapSnapshot: Record<string, string>;
  nextQuestion: string | null;
  nextQuestionTargetGap: string | null;
  nextQuestionWhy: string | null;
};

export type RealBusinessReviewSessionTrace = {
  status: 'BLOCKED' | 'CAPTURED';
  sessionId: string | null;
  productionUrl: string;
  gitSha: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  turns: RealBusinessReviewTurnTrace[];
  finalKnowledgeState: Record<string, unknown> | null;
  reasoning: Record<string, unknown> | null;
  judgment: Record<string, unknown> | null;
  uncertainty: string[] | null;
  nextValidation: string[] | null;
  blockReason?: string;
};

export function emptyBlockedRealBusinessTrace(blockReason: string): RealBusinessReviewSessionTrace {
  return {
    status: 'BLOCKED',
    sessionId: null,
    productionUrl: 'https://ai-startup-validation-tau.vercel.app',
    gitSha: null,
    startedAt: null,
    finishedAt: new Date().toISOString(),
    turns: [],
    finalKnowledgeState: null,
    reasoning: null,
    judgment: null,
    uncertainty: null,
    nextValidation: null,
    blockReason,
  };
}
