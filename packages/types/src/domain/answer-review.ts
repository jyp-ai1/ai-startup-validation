/**
 * S12 — V3 AnswerReview Data Contract (frozen, read-only in PR1).
 * @see docs/architecture/ai-pm-v3/readiness/V3_ANSWER_REVIEW_DATA_CONTRACT.md
 */

export type ConversationFactKey =
  | 'business'
  | 'customer'
  | 'problem'
  | 'buyer'
  | 'revenue'
  | 'market'
  | 'competitor'
  | 'differentiation'
  | 'diffRelevance'
  | 'defensibility';

export type AiPmLoopIssueId =
  | 'customer_definition'
  | 'competitor_analysis'
  | 'bm_design'
  | 'market_validation'
  | 'problem_definition';

export type AnswerIntent =
  | 'business_fact'
  | 'why_meta'
  | 'mid_judgment'
  | 'nonsense'
  | 'correction'
  | 'unknown_signal';

export type AnswerQuality =
  | 'VALID'
  | 'PARTIAL'
  | 'AMBIGUOUS'
  | 'IRRELEVANT'
  | 'CONTRADICTORY'
  | 'UNKNOWN';

export type EvidenceClass =
  | 'FACT'
  | 'INFERENCE'
  | 'ASSUMPTION'
  | 'UNKNOWN'
  | 'CONTRADICTION';

export type GapCompleteness = 'CLOSED' | 'PARTIAL' | 'OPEN' | 'CONTRADICTED';

export type RecommendedAction = 'probe' | 'clarify' | 'advance' | 'challenge';

export type GapVerdict = {
  gapId: string;
  completeness: GapCompleteness;
  rationale: string;
  factKeys: ConversationFactKey[];
};

export type ExtractedFact = {
  key: ConversationFactKey;
  value: string;
  evidenceClass: EvidenceClass;
  confidence: 'high' | 'medium' | 'low';
  targetGap: string;
  source: 'explicit' | 'inferred' | 'corrected';
};

export type ContradictionRecord = {
  factKey: ConversationFactKey;
  gapId: string;
  priorValue: string;
  newValue: string;
  resolutionRequired: boolean;
};

export type AnswerReview = {
  reviewId: string;
  turnId: string;
  sourceTurnId: string;
  createdAt: string;

  askedGapId: string;
  askedQuestionText: string;
  askedIssueId: AiPmLoopIssueId;
  userAnswer: string;

  extractedFacts: ExtractedFact[];
  known: string[];
  unknown: string[];
  unconfirmed: string[];
  contradictions: ContradictionRecord[];
  gapVerdicts: Record<string, GapVerdict>;

  recommendedAction: RecommendedAction;
  rationale: string;

  semanticInterpretationRef?: {
    intent: AnswerIntent;
    quality: AnswerQuality;
    mergeable: boolean;
  };
};
