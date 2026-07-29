import type { WorkspaceDomainEvidence } from '../../lib/workspace-ai-pm-messages';

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

function fieldFilled(domain: WorkspaceDomainEvidence, id: WorkspaceNavNodeId): boolean {
  const value = domain[id]?.trim() ?? '';
  return value.length >= 2;
}

function lifecycleForDomainNode(
  id: WorkspaceNavNodeId,
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
): NavNodeLifecycle {
  const index = DOMAIN_ORDER.indexOf(id);
  const prevId = index > 0 ? DOMAIN_ORDER[index - 1] : null;
  const prevDone = prevId ? fieldFilled(domain, prevId) : true;
  const selfDone = fieldFilled(domain, id);

  if (selfDone) return 'completed';
  if (prevDone) return 'in_progress';
  return 'waiting';
}

export function buildWorkspaceSidebarSnapshot(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
): WorkspaceSidebarSnapshot {
  const nodes: WorkspaceNavNode[] = DOMAIN_ORDER.map((id) => ({
    id,
    labelKey: id,
    lifecycle: lifecycleForDomainNode(id, domain, reviewCount),
  }));

  const completedTopics = nodes.filter((n) => n.lifecycle === 'completed').length;
  const totalTopics = nodes.length;
  const progressPercent = Math.round((completedTopics / totalTopics) * 100);
  const activeNode = nodes.find((n) => n.lifecycle === 'in_progress') ?? nodes[0]!;

  return {
    businessScore: reviewCount > 0 ? 74 : null,
    progressPercent: reviewCount > 0 ? Math.max(progressPercent, 20) : progressPercent,
    completedTopics,
    totalTopics,
    activeStageKey: activeNode.labelKey,
    lastUpdatedMinutesAgo: reviewCount > 0 ? 12 : 0,
    nodes,
  };
}
