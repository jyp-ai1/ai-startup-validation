import { isSupabaseConfigured } from '@repo/db';
import type {
  GovernmentGrant,
  GrantDashboard,
  GrantListFilter,
  VOCDistributionItem,
} from '@repo/types/validation';
import {
  GRANT_STATUSES,
  GRANT_SUPPORT_TYPES,
} from '@repo/types/validation';

import { getGovernmentGrantRepository } from '@/lib/db/platform';

import {
  GRANT_STATUS_LABELS,
  GRANT_SUPPORT_TYPE_LABELS,
} from '../schemas/grant-schema';

export async function listGrants(
  projectId: string,
  filter?: GrantListFilter,
): Promise<GovernmentGrant[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const repo = getGovernmentGrantRepository();
  return repo.findByProjectId(projectId, filter);
}

export async function findGrant(id: string): Promise<GovernmentGrant | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const repo = getGovernmentGrantRepository();
  return repo.findById(id);
}

function buildDistribution<T extends string>(
  grants: GovernmentGrant[],
  getValue: (grant: GovernmentGrant) => T | null,
  keys: readonly T[],
  labels: Record<T, string>,
): VOCDistributionItem[] {
  const counts = new Map<string, number>();
  for (const key of keys) {
    counts.set(labels[key], 0);
  }
  counts.set('Unset', 0);

  for (const grant of grants) {
    const value = getValue(grant);
    const label = value ? labels[value] : 'Unset';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()].map(([label, count]) => ({ label, count }));
}

export async function buildGrantDashboard(projectId: string): Promise<GrantDashboard> {
  const grants = await listGrants(projectId);

  const scored = grants.filter((g) => g.fitScore !== null);
  const averageFitScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, g) => sum + (g.fitScore ?? 0), 0) / scored.length,
        )
      : null;

  const deadlines = grants
    .filter((g): g is GovernmentGrant & { deadline: string } => Boolean(g.deadline))
    .map((g) => ({
      id: g.id,
      name: g.name,
      organization: g.organization,
      deadline: g.deadline!,
      status: g.status,
      fitScore: g.fitScore,
    }))
    .sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );

  return {
    totalCount: grants.length,
    averageFitScore,
    supportTypeDistribution: buildDistribution(
      grants,
      (g) => g.supportType,
      GRANT_SUPPORT_TYPES,
      GRANT_SUPPORT_TYPE_LABELS,
    ),
    statusDistribution: buildDistribution(
      grants,
      (g) => g.status,
      GRANT_STATUSES,
      GRANT_STATUS_LABELS,
    ),
    deadlines,
  };
}
