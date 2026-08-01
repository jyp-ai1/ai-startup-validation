import type { AiPmLoopIssueId } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

/** Product-facing phase — factual progress only (persisted). */
export type AiPmPhaseId =
  | 'intake'
  | 'ai_read'
  | 'customer_validation'
  | 'problem_validation'
  | 'bm_design'
  | 'competitor_analysis'
  | 'market_validation'
  | 'review'
  | 'strategy'
  | 'roadmap';

/** Structured history events — facts, not AI prose. */
export type WorkspaceHistoryEvent =
  | 'intake_completed'
  | 'ai_read_completed'
  | 'customer_definition_completed'
  | 'problem_definition_completed'
  | 'bm_design_completed'
  | 'competitor_analysis_completed'
  | 'market_validation_completed'
  | 'document_updated'
  | 'review_completed';

/** Persist layer — facts only. Judgment is generated at runtime. */
export type WorkspacePersistedFacts = {
  version: 2;
  completedSteps: AiPmPhaseId[];
  history: WorkspaceHistoryEvent[];
  lastActiveAt: string;
};

export const ISSUE_TO_AI_PM_PHASE: Record<AiPmLoopIssueId, AiPmPhaseId> = {
  customer_definition: 'customer_validation',
  problem_definition: 'problem_validation',
  bm_design: 'bm_design',
  competitor_analysis: 'competitor_analysis',
  market_validation: 'market_validation',
};

export const ISSUE_TO_HISTORY_EVENT: Record<AiPmLoopIssueId, WorkspaceHistoryEvent> = {
  customer_definition: 'customer_definition_completed',
  problem_definition: 'problem_definition_completed',
  bm_design: 'bm_design_completed',
  competitor_analysis: 'competitor_analysis_completed',
  market_validation: 'market_validation_completed',
};

const VALID_PHASES = new Set<AiPmPhaseId>([
  'intake',
  'ai_read',
  'customer_validation',
  'problem_validation',
  'bm_design',
  'competitor_analysis',
  'market_validation',
  'review',
  'strategy',
  'roadmap',
]);

const VALID_HISTORY = new Set<WorkspaceHistoryEvent>([
  'intake_completed',
  'ai_read_completed',
  'customer_definition_completed',
  'problem_definition_completed',
  'bm_design_completed',
  'competitor_analysis_completed',
  'market_validation_completed',
  'document_updated',
  'review_completed',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseHistory(raw: unknown): WorkspaceHistoryEvent[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is WorkspaceHistoryEvent =>
      typeof item === 'string' && VALID_HISTORY.has(item as WorkspaceHistoryEvent),
  );
}

function parseCompletedSteps(raw: unknown): AiPmPhaseId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is AiPmPhaseId =>
      typeof item === 'string' && VALID_PHASES.has(item as AiPmPhaseId),
  );
}

/** Parse v2 facts. Ignores legacy v1 judgment fields if present. */
export function parseWorkspacePersistedFacts(raw: unknown): WorkspacePersistedFacts | undefined {
  if (!isRecord(raw)) return undefined;

  const version = raw.version;
  const lastActiveAt = typeof raw.lastActiveAt === 'string' ? raw.lastActiveAt : '';

  if (version === 2) {
    if (!lastActiveAt) return undefined;
    return {
      version: 2,
      completedSteps: parseCompletedSteps(raw.completedSteps),
      history: parseHistory(raw.history),
      lastActiveAt,
    };
  }

  // Legacy v1 aiPmState — extract facts only, drop judgment fields.
  if (version === 1 && lastActiveAt) {
    return {
      version: 2,
      completedSteps: parseCompletedSteps(raw.completed),
      history: migrateLegacyHistory(raw),
      lastActiveAt,
    };
  }

  return undefined;
}

function migrateLegacyHistory(raw: Record<string, unknown>): WorkspaceHistoryEvent[] {
  const history: WorkspaceHistoryEvent[] = [];
  const lastResolved = raw.lastResolvedIssueId;
  if (
    typeof lastResolved === 'string' &&
    lastResolved in ISSUE_TO_HISTORY_EVENT
  ) {
    history.push(ISSUE_TO_HISTORY_EVENT[lastResolved as AiPmLoopIssueId]);
  }
  return history;
}

export function hasWorkspaceHistory(facts: WorkspacePersistedFacts | undefined): boolean {
  return (facts?.history.length ?? 0) > 0;
}
