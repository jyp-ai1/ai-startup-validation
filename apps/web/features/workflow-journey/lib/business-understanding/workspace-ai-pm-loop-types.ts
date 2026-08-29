import type { ConversationFactKey } from './conversation-memory';
import type { AnswerIntent } from './interpret-answer-semantics';
import type { QuestionCausality } from './question-causality';

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
  /** Core v3 — primary semantic fact key (may differ from asked issue template) */
  semanticFactKey?: ConversationFactKey | null;
  /** Core v4 — all semantic facts extracted from one utterance */
  semanticFactKeys?: ConversationFactKey[];
  /** Core v3 — intent classification */
  intent?: AnswerIntent;
  /** Core v3 — superseded after prior-answer edit */
  superseded?: boolean;
  /** Core v3 — why this question was asked (judgment gap) — transcript/UI */
  whyNow?: string;
  /** P0-4 — Living gap fieldKey aligned with whyNow */
  targetGap?: string;
  /** Loop 9d — visible question at submit (display SoT when targetGap poisoned) */
  askedQuestionText?: string;
  /** Core v4/v5 — brief AI understanding delta shown before next Q (must be populated) */
  understandingDelta?: string;
  /** Core v5 — full question causality for the ask that produced this turn */
  causality?: QuestionCausality;
  /** Core v5 — evidence excerpts that motivated the ask */
  sourceEvidence?: string[];
  /** Core v5 — understanding snapshot before the answer */
  previousUnderstanding?: string;
  /** Core v5 — unresolved gap fieldKey at ask time */
  unresolvedGap?: string;
  /** Core v5 — what information the ask expected */
  expectedInformation?: string;
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
