import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

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

  // P0 — founder/customer only count when document-backed
  if (id === 'founder' || id === 'customer') {
    const basis = getDomainFieldMeta(id, entities);
    return basis === 'document';
  }

  return true;
}

function lifecycleForDomainNode(
  id: WorkspaceNavNodeId,
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
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
): WorkspaceSidebarSnapshot {
  const nodes: WorkspaceNavNode[] = DOMAIN_ORDER.map((id) => ({
    id,
    labelKey: id,
    lifecycle: lifecycleForDomainNode(id, domain, reviewCount, entities),
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
    lastUpdatedMinutesAgo: reviewCount > 0 ? 0 : -1,
    nodes,
  };
}
