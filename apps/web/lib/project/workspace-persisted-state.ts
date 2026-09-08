/**
 * LaunchLens workspace persistence — source of truth in DB only.
 *
 * Flow: DB (`onboardingContext.v2Workspace`) → Workspace State → UI
 * sessionStorage keys are write-through cache mirrors, never authoritative on load.
 */
import type { ConversationMemory } from '@/features/workflow-journey/lib/business-understanding/conversation-memory';
import type { AiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';
import type { UnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import type { WorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';
import type { StartupProject } from '@repo/types/validation';
import { parseWorkspacePersistedFacts } from '@/lib/project/workspace-persisted-facts';
import type { ProjectConsultingState } from '@/features/workflow-journey/lib/business-understanding/project-consulting-state';
import type { WorkspaceDomainEvidence } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

export type WorkspacePersistedSnapshot = {
  documentText?: string;
  aiPmLoop?: AiPmLoopState;
  /** Persist layer — facts only (completedSteps, history). Judgment is runtime. */
  workspaceFacts?: WorkspacePersistedFacts;
  understandingPhase?: UnderstandingPhase;
  reviewCount?: number;
  /** DAY 8-I — project consulting continuity + immutable snapshots */
  projectConsulting?: ProjectConsultingState;
  /** Canonical domain evidence (correction survives refresh). */
  domain?: WorkspaceDomainEvidence;
  /** Canonical entity context aligned with domain. */
  entities?: LaunchLensDomainContext;
  /** USER_CORRECTED facts and confirmed conversation memory. */
  conversationMemory?: ConversationMemory;
  updatedAt: string;
};

const V2_WORKSPACE_KEY = 'v2Workspace';

const DOMAIN_FIELD_IDS = ['founder', 'business', 'customer', 'market', 'competitor'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseWorkspaceDomain(raw: unknown): WorkspaceDomainEvidence | undefined {
  if (!isRecord(raw)) return undefined;
  const domain = {} as WorkspaceDomainEvidence;
  for (const id of DOMAIN_FIELD_IDS) {
    domain[id] = typeof raw[id] === 'string' ? raw[id] : '';
  }
  if (DOMAIN_FIELD_IDS.every((id) => !domain[id]?.trim())) return undefined;
  return domain;
}

function parseWorkspaceEntities(raw: unknown): LaunchLensDomainContext | undefined {
  if (!isRecord(raw)) return undefined;
  const required = ['founder', 'business', 'customer', 'product', 'market', 'competitor'] as const;
  if (!required.every((key) => isRecord(raw[key]))) return undefined;
  return raw as LaunchLensDomainContext;
}

function parseConversationMemory(raw: unknown, projectId: string): ConversationMemory | undefined {
  if (!isRecord(raw)) return undefined;
  if (raw.version !== 1 || !Array.isArray(raw.facts)) return undefined;
  const facts = raw.facts.filter(
    (fact): fact is ConversationMemory['facts'][number] =>
      isRecord(fact) &&
      typeof fact.key === 'string' &&
      typeof fact.value === 'string' &&
      fact.value.trim().length >= 2 &&
      (fact.source === 'document' || fact.source === 'user_turn'),
  );
  if (facts.length === 0) return undefined;
  return {
    version: 1,
    projectId: typeof raw.projectId === 'string' ? raw.projectId : projectId,
    facts,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
  };
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
  const projectConsulting =
    isRecord(raw.projectConsulting) && typeof raw.projectConsulting.projectId === 'string'
      ? (raw.projectConsulting as ProjectConsultingState)
      : undefined;
  const domain = parseWorkspaceDomain(raw.domain);
  const entities = parseWorkspaceEntities(raw.entities);
  const conversationMemory = parseConversationMemory(raw.conversationMemory, project?.id ?? '');

  return {
    documentText,
    aiPmLoop,
    workspaceFacts,
    understandingPhase,
    reviewCount,
    projectConsulting,
    domain,
    entities,
    conversationMemory,
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
