/**
 * DAY 8-I — Project consulting continuity: current state + immutable snapshots.
 * DB is authoritative via WorkspacePersistedSnapshot; sessionStorage is write-through cache.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { JudgmentTurnTrace } from './ai-pm-judgment-trace';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';
import { parseIntakeSeedDocument } from '@/lib/project/parse-intake-seed';

export type ProjectSnapshotTrigger =
  | 'PROJECT_CREATED'
  | 'SESSION_END'
  | 'JUDGMENT_UPDATED'
  | 'BUSINESS_REVIEW'
  | 'CEO_CONFIRMED'
  | 'CEO_CORRECTED'
  | 'MANUAL_CHECKPOINT';

export type ProjectBusinessProfile = {
  projectName?: string;
  businessOneLiner?: string;
  customer?: string;
  problem?: string;
  solution?: string;
  customerChange?: string;
  documentText?: string;
};

export type ProjectConsultingSnapshot = {
  snapshotId: string;
  projectId: string;
  createdAt: string;
  trigger: ProjectSnapshotTrigger;
  stage?: string;
  businessProfile: ProjectBusinessProfile;
  understanding?: string;
  judgment?: CeoJudgmentState | null;
  openQuestions?: string[];
  businessReview?: {
    verdictLabel?: string;
    oneLiner?: string;
    nextAction?: string;
  } | null;
  nextAction?: string | null;
  judgmentTraces?: JudgmentTurnTrace[];
};

export type ProjectConsultingState = {
  version: 1;
  projectId: string;
  updatedAt: string;
  businessProfile: ProjectBusinessProfile;
  conversationTurnCount: number;
  livingUnderstanding?: string;
  judgmentState?: CeoJudgmentState | null;
  openItems?: string[];
  businessReview?: ProjectConsultingSnapshot['businessReview'];
  nextAction?: string | null;
  snapshots: ProjectConsultingSnapshot[];
};

export function createEmptyProjectConsultingState(projectId: string): ProjectConsultingState {
  const now = new Date().toISOString();
  return {
    version: 1,
    projectId,
    updatedAt: now,
    businessProfile: {},
    conversationTurnCount: 0,
    snapshots: [],
  };
}

export function buildBusinessProfileFromJudgment(input: {
  documentText?: string;
  judgment?: CeoJudgmentState | null;
  projectName?: string;
}): ProjectBusinessProfile {
  const j = input.judgment;
  const intake = input.documentText ? parseIntakeSeedDocument(input.documentText) : null;
  const businessOneLiner =
    intake?.businessOneLinerCandidate ??
    (j?.oneLiner?.trim() || undefined);

  return {
    projectName: input.projectName ?? intake?.projectTitle ?? undefined,
    documentText: input.documentText,
    businessOneLiner,
    customer: j?.dimensions.customer.summary || undefined,
    problem: j?.dimensions.problem.summary || undefined,
    solution: j?.dimensions.solution.summary || undefined,
    customerChange: j?.dimensions.customerChange.summary || undefined,
  };
}

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createProjectSnapshot(input: {
  projectId: string;
  trigger: ProjectSnapshotTrigger;
  businessProfile: ProjectBusinessProfile;
  judgment?: CeoJudgmentState | null;
  understanding?: string;
  openQuestions?: string[];
  businessReview?: ProjectConsultingSnapshot['businessReview'];
  nextAction?: string | null;
  judgmentTraces?: JudgmentTurnTrace[];
  stage?: string;
  snapshotId?: string;
}): ProjectConsultingSnapshot {
  return {
    snapshotId: input.snapshotId ?? `snap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: input.projectId,
    createdAt: new Date().toISOString(),
    trigger: input.trigger,
    stage: input.stage,
    businessProfile: { ...input.businessProfile },
    understanding: input.understanding,
    judgment: input.judgment ? cloneDeep(input.judgment) : null,
    openQuestions: input.openQuestions ? [...input.openQuestions] : undefined,
    businessReview: input.businessReview ? { ...input.businessReview } : null,
    nextAction: input.nextAction ?? null,
    judgmentTraces: input.judgmentTraces ? cloneDeep(input.judgmentTraces) : undefined,
  };
}

/** Immutable append — past snapshots never mutate when current state changes. */
export function appendProjectSnapshot(
  state: ProjectConsultingState,
  snapshot: ProjectConsultingSnapshot,
): ProjectConsultingState {
  return {
    ...state,
    updatedAt: new Date().toISOString(),
    snapshots: [...state.snapshots, cloneDeep(snapshot)],
  };
}

export function syncConsultingStateFromLoop(input: {
  state: ProjectConsultingState;
  loop: AiPmLoopState;
  documentText?: string;
  projectName?: string;
  understanding?: string;
  businessReview?: ProjectConsultingSnapshot['businessReview'];
  nextAction?: string | null;
}): ProjectConsultingState {
  const profile = buildBusinessProfileFromJudgment({
    documentText: input.documentText,
    judgment: input.loop.ceoJudgment,
    projectName: input.projectName,
  });

  return {
    ...input.state,
    updatedAt: new Date().toISOString(),
    businessProfile: profile,
    conversationTurnCount: input.loop.turns.filter((t) => !t.superseded).length,
    livingUnderstanding: input.understanding,
    judgmentState: input.loop.ceoJudgment ?? null,
    businessReview: input.businessReview ?? input.state.businessReview,
    nextAction: input.nextAction ?? input.state.nextAction,
  };
}

/** Latest snapshot judgment must differ from historical when CEO corrected. */
export function findSnapshotById(
  state: ProjectConsultingState,
  snapshotId: string,
): ProjectConsultingSnapshot | null {
  return state.snapshots.find((s) => s.snapshotId === snapshotId) ?? null;
}
