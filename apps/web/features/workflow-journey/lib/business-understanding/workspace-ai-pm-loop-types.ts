export type AiPmLoopIssueId =
  | 'customer_definition'
  | 'competitor_analysis'
  | 'bm_design'
  | 'market_validation'
  | 'problem_definition';

export type AiPmLoopPhase = 'read_ack' | 'issue' | 'answer' | 'reanalyze' | 'complete';

export type AiPmLoopTurn = {
  issueId: AiPmLoopIssueId;
  answer: string;
  appliedAt: string;
};

export type AiPmLoopState = {
  version: 1;
  phase: AiPmLoopPhase;
  turns: AiPmLoopTurn[];
  currentIssueId: AiPmLoopIssueId | null;
  /** Staged reading animation finished — show initial diagnosis before loop questions. */
  readingCompleted: boolean;
  dismissedReadAck: boolean;
};

export const AI_PM_LOOP_MIN_TURNS = 3;

export const AI_PM_LOOP_ISSUE_ORDER: AiPmLoopIssueId[] = [
  'customer_definition',
  'problem_definition',
  'bm_design',
  'competitor_analysis',
  'market_validation',
];
