/**
 * S13 — V3 Gap Knowledge State Contract (frozen, read-only in PR3).
 * @see docs/architecture/ai-pm-v3/readiness/V3_GAP_KNOWLEDGE_STATE_CONTRACT.md
 */

import type { ConversationFactKey, EvidenceClass, GapCompleteness } from './answer-review';

export type GapKnowledgeRecord = {
  gapId: string;
  completeness: GapCompleteness;
  sourceTurnId: string | null;
  sourceReviewId: string | null;
  evidence: Array<{ factKey: ConversationFactKey; value: string; evidenceClass: EvidenceClass }>;
  confidence: 'high' | 'medium' | 'low';
  lastUpdated: string;
  rationale: string;
};

export type GapKnowledgeState = {
  version: 1;
  gaps: Record<string, GapKnowledgeRecord>;
  /** Monotonic — latest review wins per gap */
  lastReviewByGap: Record<string, string>;
};
