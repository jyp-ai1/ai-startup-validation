import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { buildWorkspaceReviewScore } from '../build-workspace-review-score';
import {
  canProceedWorkspaceReview,
  emptyWorkspaceDomain,
  getDomainFieldMeta,
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  loadWorkspaceDomain,
  loadWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '../workspace-ai-pm-messages';
import type { WorkspaceSidebarSnapshot } from '../../components/project-workspace-shell/workspace-shell-types';
import type {
  NavNodeLifecycle,
  WorkspaceNavNode,
  WorkspaceNavNodeId,
} from '../../components/project-workspace-shell/workspace-shell-types';

import { buildBusinessUnderstanding } from './build-business-understanding';
import type { UnderstandingPhase } from './business-understanding-store';
import { buildWorkspaceBusinessState, type WorkspaceBusinessState } from './build-ai-pm-business-clarity';
import {
  buildSharedUnderstanding,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import { evaluateDomainTrust } from '../domain/domain-trust-rules';
import { resolveNextLoopIssue } from './resolve-ai-pm-priority-issue';
import { loadConversationMemory } from './conversation-memory-store';
import {
  deriveEvidenceStatusFromMemory,
  firstReviewEvidenceGap,
  isRequiredReviewEvidenceConfirmed,
} from './evidence-status';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { allowsOpenReview, loadMarketAlignment } from './workspace-alignment';
import { hasAnalysisResult } from './analysis-result-store';
import {
  isWorkspaceDocumentAnalyzable,
  isWorkspaceDocumentReadable,
} from './workspace-document-eligibility';
import { isAiPmLoopComplete } from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId, AiPmLoopState } from './workspace-ai-pm-loop-types';

const DOMAIN_ORDER: WorkspaceNavNodeId[] = [
  'founder',
  'business',
  'customer',
  'market',
  'competitor',
];

/** S7-3 — user-facing review blockers only (no internal phase names). */
export type WorkspaceReviewBlockedReason =
  | 'customer_missing'
  | 'payer_missing'
  | 'problem_missing'
  | 'document_unreadable'
  | 'demo_readonly';

/** S7-2/3 — single review gate (replaces scattered guards). */
export type WorkspaceReviewGate = {
  count: number;
  canStart: boolean;
  blockedReason: WorkspaceReviewBlockedReason | null;
};

/** S7-2 Workspace aggregate — single source for Header · Sidebar · Review · Loop views. */
export type WorkspaceState = {
  version: 1;
  projectId?: string;
  document: {
    text: string;
    analyzable: boolean;
    readable: boolean;
  };
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext | null;
  understanding: BusinessUnderstanding | null;
  loop: AiPmLoopState;
  understandingPhase: UnderstandingPhase;
  loopInProgress: boolean;
  review: WorkspaceReviewGate;
  header: WorkspaceBusinessState | null;
  sidebar: WorkspaceSidebarSnapshot;
  /** S8-1 — business · customer · problem spine (always when analyzable). */
  sharedUnderstanding: WorkspaceSharedUnderstanding | null;
};

export type WorkspaceJourneyStepId = 'business' | 'customer' | 'market' | 'review';

export type WorkspaceJourneyStep = {
  id: WorkspaceJourneyStepId;
  lifecycle: NavNodeLifecycle;
};

export type DeriveWorkspaceStateInput = {
  projectId?: string;
  loop: AiPmLoopState;
  understandingPhase: UnderstandingPhase;
  reviewCount: number;
  isDemoReadonly?: boolean;
  /** Optional React overrides — storage is fallback via inferDomainFromPaste. */
  domain?: WorkspaceDomainEvidence;
  entities?: LaunchLensDomainContext | null;
  documentText?: string;
};

function loopAnsweredIssue(loop: AiPmLoopState, issueId: AiPmLoopIssueId): boolean {
  return loop.turns.some((turn) => turn.issueId === issueId);
}

function fieldFilled(
  domain: WorkspaceDomainEvidence,
  id: WorkspaceNavNodeId,
  entities: LaunchLensDomainContext | null,
): boolean {
  const value = domain[id]?.trim() ?? '';
  if (value.length < 2) return false;

  if (id === 'founder' || id === 'customer') {
    return getDomainFieldMeta(id, entities) === 'document';
  }

  return true;
}

function lifecycleForDomainNode(
  id: WorkspaceNavNodeId,
  domain: WorkspaceDomainEvidence,
  entities: LaunchLensDomainContext | null,
): NavNodeLifecycle {
  const index = DOMAIN_ORDER.indexOf(id);
  const prevId = index > 0 ? DOMAIN_ORDER[index - 1] : null;
  const prevDone = prevId ? fieldFilled(domain, prevId, entities) : true;
  const selfDone = fieldFilled(domain, id, entities);

  if (selfDone) return 'completed';
  if (prevDone) return 'in_progress';
  return 'waiting';
}

function lifecycleForNode(
  id: WorkspaceNavNodeId,
  understanding: BusinessUnderstanding,
  entities: LaunchLensDomainContext | null,
  loop: AiPmLoopState,
): NavNodeLifecycle {
  switch (id) {
    case 'founder':
      if (understanding.founder.status === 'document') return 'completed';
      return 'in_progress';
    case 'business':
      if (understanding.business.status === 'document') return 'completed';
      if (understanding.founder.status === 'document') return 'in_progress';
      return 'waiting';
    case 'customer':
      if (loopAnsweredIssue(loop, 'customer_definition')) return 'completed';
      if (understanding.customer.status === 'document' && understanding.customer.value) {
        return 'completed';
      }
      if (
        understanding.customer.status === 'needs_confirmation' ||
        understanding.customerMentions.length > 0
      ) {
        return 'in_progress';
      }
      if (understanding.business.status === 'document') return 'in_progress';
      return 'waiting';
    case 'market': {
      if (entities?.market.basis === 'document' && entities.market.value) return 'completed';
      if (
        loopAnsweredIssue(loop, 'customer_definition') ||
        understanding.customer.status === 'document' ||
        understanding.customerMentions.length > 0
      ) {
        return 'in_progress';
      }
      return 'waiting';
    }
    case 'competitor': {
      if (entities?.competitor.basis === 'document' && entities.competitor.value) {
        return 'completed';
      }
      if (entities?.market.basis === 'document') return 'in_progress';
      return 'waiting';
    }
    default:
      return 'waiting';
  }
}

function issueIdToBlockedReason(issueId: AiPmLoopIssueId): WorkspaceReviewBlockedReason {
  switch (issueId) {
    case 'problem_definition':
      return 'problem_missing';
    case 'bm_design':
      return 'payer_missing';
    case 'customer_definition':
    case 'competitor_analysis':
    case 'market_validation':
    default:
      return 'customer_missing';
  }
}

function nextLoopBlockedReason(input: {
  understanding: BusinessUnderstanding;
  loop: AiPmLoopState;
  documentText: string;
  entities: LaunchLensDomainContext | null;
  projectId?: string;
}): WorkspaceReviewBlockedReason | null {
  const nextIssue = resolveNextLoopIssue(input.understanding, input.loop, {
    documentText: input.documentText,
    entities: input.entities,
    memory: loadConversationMemory(input.projectId),
    analysisResultExists: hasAnalysisResult(input.projectId),
  });
  return nextIssue ? issueIdToBlockedReason(nextIssue) : null;
}

function resolveReviewBlockedReason(input: {
  documentReadable: boolean;
  understandingPhase: UnderstandingPhase;
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext | null;
  understanding: BusinessUnderstanding | null;
  loop: AiPmLoopState;
  documentText: string;
  projectId?: string;
}): WorkspaceReviewBlockedReason {
  if (!input.documentReadable) return 'document_unreadable';

  // S14 Evidence Sync: Memory → Evidence Status → gap
  const memory = buildConversationMemoryFromSources({
    projectId: input.projectId ?? 'default',
    documentText: input.documentText,
    turns: input.loop.turns,
    entities: input.entities,
    previous: loadConversationMemory(input.projectId),
  });
  const evidence = deriveEvidenceStatusFromMemory({
    memory,
    entities: input.entities,
  });
  const gap = firstReviewEvidenceGap(evidence);
  if (gap) return gap;

  if (input.entities) {
    const trust = evaluateDomainTrust(input.entities);
    if (trust.issues.includes('founder_equals_customer')) return 'customer_missing';
  }

  if (input.understanding && input.understandingPhase !== 'review-ready') {
    return (
      nextLoopBlockedReason({
        understanding: input.understanding,
        loop: input.loop,
        documentText: input.documentText,
        entities: input.entities,
        projectId: input.projectId,
      }) ?? 'problem_missing'
    );
  }

  return 'problem_missing';
}

function deriveReviewGate(input: {
  understandingPhase: UnderstandingPhase;
  reviewCount: number;
  isDemoReadonly: boolean;
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext | null;
  understanding: BusinessUnderstanding | null;
  loop: AiPmLoopState;
  documentText: string;
  documentReadable: boolean;
  projectId?: string;
}): WorkspaceReviewGate {
  const {
    understandingPhase,
    reviewCount,
    isDemoReadonly,
    domain,
    entities,
    understanding,
    loop,
    documentText,
    documentReadable,
    projectId,
  } = input;

  if (isDemoReadonly) {
    return {
      count: reviewCount,
      canStart: false,
      blockedReason: 'demo_readonly',
    };
  }

  const alignment = loadMarketAlignment(projectId);
  const alignmentOpen = allowsOpenReview(alignment);
  const domainReady = canProceedWorkspaceReview(domain, entities);
  const phaseReady = understandingPhase === 'review-ready';

  // S14: Review Gate reads Evidence Status (from Memory), not Loop directly
  const memory = buildConversationMemoryFromSources({
    projectId: projectId ?? 'default',
    documentText,
    turns: loop.turns,
    entities,
    previous: loadConversationMemory(projectId),
  });
  const evidence = deriveEvidenceStatusFromMemory({ memory, entities });
  const evidenceReady = isRequiredReviewEvidenceConfirmed(evidence);
  const canStart =
    documentReadable &&
    evidenceReady &&
    (phaseReady || alignmentOpen || domainReady || evidenceReady);

  if (canStart) {
    return { count: reviewCount, canStart: true, blockedReason: null };
  }

  return {
    count: reviewCount,
    canStart: false,
    blockedReason: resolveReviewBlockedReason({
      documentReadable,
      understandingPhase,
      domain,
      entities,
      understanding,
      loop,
      documentText,
      projectId,
    }),
  };
}

function mergeLifecycle(a: NavNodeLifecycle, b: NavNodeLifecycle): NavNodeLifecycle {
  if (a === 'completed' || b === 'completed') return 'completed';
  if (a === 'in_progress' || b === 'in_progress') return 'in_progress';
  return 'waiting';
}

function deriveJourneySteps(
  nodes: WorkspaceNavNode[],
  understandingPhase: UnderstandingPhase,
  reviewCount: number,
  loopInProgress: boolean,
): WorkspaceJourneyStep[] {
  const byId = Object.fromEntries(nodes.map((node) => [node.id, node.lifecycle])) as Partial<
    Record<WorkspaceNavNodeId, NavNodeLifecycle>
  >;
  const businessLifecycle = mergeLifecycle(
    byId.founder ?? 'waiting',
    byId.business ?? 'waiting',
  );
  const customerLifecycle = byId.customer ?? 'waiting';
  const marketLifecycle = byId.market ?? 'waiting';

  let reviewLifecycle: NavNodeLifecycle = 'waiting';
  if (reviewCount > 0 || understandingPhase === 'review-ready') {
    reviewLifecycle = 'completed';
  } else if (
    !loopInProgress &&
    (customerLifecycle === 'completed' || marketLifecycle === 'completed')
  ) {
    reviewLifecycle = 'in_progress';
  } else if (customerLifecycle === 'in_progress') {
    reviewLifecycle = 'waiting';
  }

  return [
    { id: 'business', lifecycle: businessLifecycle },
    { id: 'customer', lifecycle: customerLifecycle },
    { id: 'market', lifecycle: marketLifecycle },
    { id: 'review', lifecycle: reviewLifecycle },
  ];
}

function deriveSidebar(input: {
  domain: WorkspaceDomainEvidence;
  understanding: BusinessUnderstanding | null;
  loop: AiPmLoopState;
  entities: LaunchLensDomainContext | null;
  understandingPhase: UnderstandingPhase;
  reviewCount: number;
  loopInProgress: boolean;
}): WorkspaceSidebarSnapshot {
  const { domain, understanding, loop, entities, understandingPhase, reviewCount, loopInProgress } =
    input;

  const useUnderstandingLifecycle =
    Boolean(understanding) && reviewCount === 0 && understandingPhase !== 'review-ready';

  const nodes: WorkspaceNavNode[] = DOMAIN_ORDER.map((id) => ({
    id,
    labelKey: id,
    lifecycle:
      useUnderstandingLifecycle && understanding
        ? lifecycleForNode(id, understanding, entities, loop)
        : lifecycleForDomainNode(id, domain, entities),
  }));

  const journeySteps = deriveJourneySteps(
    nodes,
    understandingPhase,
    reviewCount,
    loopInProgress,
  );
  const stepFirstProgress = reviewCount === 0;

  if (loopInProgress) {
    return {
      businessScore: null,
      scoreDimensions: [],
      progressPercent: 0,
      completedTopics: 0,
      totalTopics: DOMAIN_ORDER.length,
      activeStageKey: 'aiPmLoop',
      lastUpdatedMinutesAgo: -1,
      nodes,
      hideProgressMetrics: true,
      journeySteps,
      stepFirstProgress,
    };
  }

  const completedTopics = nodes.filter((n) => n.lifecycle === 'completed').length;
  const totalTopics = nodes.length;
  const progressPercent = Math.round((completedTopics / totalTopics) * 100);
  const activeNode = nodes.find((n) => n.lifecycle === 'in_progress') ?? nodes[0]!;
  const reviewScore = buildWorkspaceReviewScore(understanding, reviewCount);
  const understandingAligned = understandingPhase === 'review-ready';

  return {
    businessScore: understandingAligned && reviewCount > 0 ? reviewScore.total : null,
    scoreDimensions: reviewScore.dimensions,
    progressPercent: reviewCount > 0 ? Math.max(progressPercent, 20) : progressPercent,
    completedTopics,
    totalTopics,
    activeStageKey: activeNode.labelKey,
    lastUpdatedMinutesAgo: reviewCount > 0 ? 0 : understanding ? -1 : 0,
    nodes,
    journeySteps,
    stepFirstProgress,
  };
}

/** Single derivation entry — no separate Sidebar/Header builders in apps. */
export function deriveWorkspaceState(input: DeriveWorkspaceStateInput): WorkspaceState {
  const storedDocument = loadWorkspaceDocumentText(input.projectId)?.trim() ?? '';
  const documentText = (input.documentText ?? storedDocument).trim();
  const inferred = documentText
    ? inferDomainFromPaste(documentText, input.projectId)
    : { domain: loadWorkspaceDomain(input.projectId), entities: loadWorkspaceEntities(input.projectId) };

  const domain = input.domain ?? inferred.domain ?? emptyWorkspaceDomain();
  const entities = input.entities ?? inferred.entities;
  const analyzable = isWorkspaceDocumentAnalyzable(documentText);
  const readable = isWorkspaceDocumentReadable(documentText);
  const understanding = analyzable ? buildBusinessUnderstanding(documentText) : null;
  const loopInProgress = input.reviewCount === 0 && !isAiPmLoopComplete(input.loop);

  const review = deriveReviewGate({
    understandingPhase: input.understandingPhase,
    reviewCount: input.reviewCount,
    isDemoReadonly: input.isDemoReadonly ?? false,
    domain,
    entities,
    understanding,
    loop: input.loop,
    documentText,
    documentReadable: readable,
    projectId: input.projectId,
  });

  const nextIssueId =
    understanding != null
      ? resolveNextLoopIssue(understanding, input.loop, {
          documentText,
          entities,
          memory: loadConversationMemory(input.projectId),
          analysisResultExists: hasAnalysisResult(input.projectId),
        })
      : null;

  const header =
    understanding && input.reviewCount === 0
      ? buildWorkspaceBusinessState({
          documentText,
          turns: input.loop.turns,
          understanding,
          nextIssueId,
          entities,
        })
      : null;

  const sidebar = deriveSidebar({
    domain,
    understanding,
    loop: input.loop,
    entities,
    understandingPhase: input.understandingPhase,
    reviewCount: input.reviewCount,
    loopInProgress,
  });

  const sharedUnderstanding =
    understanding && input.reviewCount === 0
      ? buildSharedUnderstanding({
          documentText,
          turns: input.loop.turns,
          understanding,
          entities,
          understandingPhase: input.understandingPhase,
        })
      : null;

  return {
    version: 1,
    projectId: input.projectId,
    document: { text: documentText, analyzable, readable },
    domain,
    entities,
    understanding,
    loop: input.loop,
    understandingPhase: input.understandingPhase,
    loopInProgress,
    review,
    header,
    sidebar,
    sharedUnderstanding,
  };
}
