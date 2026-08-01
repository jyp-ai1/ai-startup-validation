/**
 * LaunchLens workspace persistence — source of truth in DB only.
 *
 * Flow: DB (`onboardingContext.v2Workspace`) → Workspace State → UI
 * sessionStorage keys are write-through cache mirrors, never authoritative on load.
 */
import type { AiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import type { UnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import type { WorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';
import type { StartupProject } from '@repo/types/validation';
import { parseWorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';

export type WorkspacePersistedSnapshot = {
  documentText?: string;
  aiPmLoop?: AiPmLoopState;
  /** Persist layer — facts only (completedSteps, history). Judgment is runtime. */
  workspaceFacts?: WorkspacePersistedFacts;
  understandingPhase?: UnderstandingPhase;
  reviewCount?: number;
  updatedAt: string;
};

const V2_WORKSPACE_KEY = 'v2Workspace';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function parseWorkspacePersistedSnapshot(
  project: StartupProject | null | undefined,
): WorkspacePersistedSnapshot | null {
  const ctx = project?.onboardingContext;
  if (!isRecord(ctx)) return null;

  const raw = ctx[V2_WORKSPACE_KEY];
  if (!isRecord(raw)) return null;

  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
  if (!updatedAt) return null;

  const documentText =
    typeof raw.documentText === 'string' && raw.documentText.trim().length >= 8
      ? raw.documentText
      : undefined;

  const aiPmLoop = isRecord(raw.aiPmLoop) ? (raw.aiPmLoop as AiPmLoopState) : undefined;
  const workspaceFacts =
    parseWorkspacePersistedFacts(raw.workspaceFacts) ??
    parseWorkspacePersistedFacts(raw.aiPmState);
  const understandingPhase =
    typeof raw.understandingPhase === 'string' ? (raw.understandingPhase as UnderstandingPhase) : undefined;
  const reviewCount = typeof raw.reviewCount === 'number' ? raw.reviewCount : undefined;

  return {
    documentText,
    aiPmLoop,
    workspaceFacts,
    understandingPhase,
    reviewCount,
    updatedAt,
  };
}

export function mergeWorkspacePersistedContext(
  existing: Record<string, unknown> | null | undefined,
  snapshot: WorkspacePersistedSnapshot,
): Record<string, unknown> {
  const prev = isRecord(existing?.[V2_WORKSPACE_KEY])
    ? (existing![V2_WORKSPACE_KEY] as Record<string, unknown>)
    : {};

  return {
    ...(existing ?? {}),
    [V2_WORKSPACE_KEY]: {
      ...prev,
      ...snapshot,
      updatedAt: snapshot.updatedAt,
    },
  };
}
