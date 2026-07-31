import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { UnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';
import type { WorkspaceDomainEvidence } from '../../lib/workspace-ai-pm-messages';
import { getDomainFieldMeta } from '../../lib/workspace-ai-pm-messages';

import type {
  NavNodeLifecycle,
  WorkspaceNavNode,
  WorkspaceNavNodeId,
  WorkspaceSidebarSnapshot,
} from './workspace-shell-types';

const DOMAIN_ORDER: WorkspaceNavNodeId[] = [
  'founder',
  'business',
  'customer',
  'market',
  'competitor',
];

function fieldFilled(
  domain: WorkspaceDomainEvidence,
  id: WorkspaceNavNodeId,
  entities?: LaunchLensDomainContext | null,
): boolean {
  const value = domain[id]?.trim() ?? '';
  if (value.length < 2) return false;

  if (id === 'founder' || id === 'customer') {
    const basis = getDomainFieldMeta(id, entities);
    return basis === 'document';
  }

  return true;
}

function lifecycleFromUnderstanding(
  id: WorkspaceNavNodeId,
  understanding: BusinessUnderstanding,
  entities?: LaunchLensDomainContext | null,
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

function lifecycleForDomainNode(
  id: WorkspaceNavNodeId,
  domain: WorkspaceDomainEvidence,
  entities?: LaunchLensDomainContext | null,
): NavNodeLifecycle {
  const index = DOMAIN_ORDER.indexOf(id);
  const prevId = index > 0 ? DOMAIN_ORDER[index - 1] : null;
  const prevDone = prevId ? fieldFilled(domain, prevId, entities) : true;
  const selfDone = fieldFilled(domain, id, entities);

  if (selfDone) return 'completed';
  if (prevDone) return 'in_progress';
  return 'waiting';
}

export function buildWorkspaceSidebarSnapshot(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
  entities?: LaunchLensDomainContext | null,
  understandingConfirmed = true,
  understanding?: BusinessUnderstanding | null,
  understandingPhase: UnderstandingPhase = 'pending',
): WorkspaceSidebarSnapshot {
  const useUnderstandingLifecycle =
    Boolean(understanding) && reviewCount === 0 && understandingPhase !== 'review-ready';

  const nodes: WorkspaceNavNode[] = DOMAIN_ORDER.map((id) => ({
    id,
    labelKey: id,
    lifecycle:
      useUnderstandingLifecycle && understanding
        ? lifecycleFromUnderstanding(id, understanding, entities)
        : lifecycleForDomainNode(id, domain, entities),
  }));

  const completedTopics = nodes.filter((n) => n.lifecycle === 'completed').length;
  const totalTopics = nodes.length;
  const progressPercent = Math.round((completedTopics / totalTopics) * 100);
  const activeNode = nodes.find((n) => n.lifecycle === 'in_progress') ?? nodes[0]!;

  return {
    businessScore: understandingConfirmed && reviewCount > 0 ? 74 : null,
    progressPercent: reviewCount > 0 ? Math.max(progressPercent, 20) : progressPercent,
    completedTopics,
    totalTopics,
    activeStageKey: activeNode.labelKey,
    lastUpdatedMinutesAgo: reviewCount > 0 ? 0 : understanding ? -1 : 0,
    nodes,
  };
}
