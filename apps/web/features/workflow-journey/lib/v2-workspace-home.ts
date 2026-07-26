import type { MockProject } from '@/features/project-intelligence/constants/mock-projects';

export const V2_RETURNING_KEY = 'll_v2_returning';

/** Workspace lifecycle on Home — color dot only, no dashboard. */
export type V2WorkspaceLifecycle = 'active' | 'review' | 'paused' | 'investigating';

export type V2WorkspaceCardData = {
  project: MockProject;
  lifecycle: V2WorkspaceLifecycle;
  changeCount: number;
  changeItemKeys: string[];
  aiPmSummaryKey: string;
};

const LIFECYCLE_DOT: Record<V2WorkspaceLifecycle, string> = {
  active: '🟢',
  review: '🟡',
  paused: '🔴',
  investigating: '🔵',
};

export function getLifecycleDot(lifecycle: V2WorkspaceLifecycle): string {
  return LIFECYCLE_DOT[lifecycle];
}

const CARD_OVERRIDES: Record<
  string,
  Pick<V2WorkspaceCardData, 'lifecycle' | 'changeCount' | 'changeItemKeys' | 'aiPmSummaryKey'>
> = {
  'proj-alpha': {
    lifecycle: 'active',
    changeCount: 3,
    changeItemKeys: ['grantAdded', 'competitorAdded', 'pricingChanged'],
    aiPmSummaryKey: 'pricingOnly',
  },
  'proj-launchlens': {
    lifecycle: 'active',
    changeCount: 0,
    changeItemKeys: [],
    aiPmSummaryKey: 'recommendation',
  },
  'proj-beta': {
    lifecycle: 'review',
    changeCount: 0,
    changeItemKeys: [],
    aiPmSummaryKey: 'holdReview',
  },
  'proj-gamma': {
    lifecycle: 'review',
    changeCount: 1,
    changeItemKeys: ['grantAvailable'],
    aiPmSummaryKey: 'grantAvailable',
  },
};

function defaultSummaryKey(project: MockProject): string {
  if (project.verdict === 'HOLD') return 'holdReview';
  if (project.confidence >= 85) return 'grantAvailable';
  return 'pricingOnly';
}

function defaultLifecycle(project: MockProject): V2WorkspaceLifecycle {
  if (project.verdict === 'NO GO') return 'paused';
  if (project.confidence >= 80) return 'active';
  if (project.confidence >= 65) return 'review';
  return 'review';
}

export function enrichProjectForHome(project: MockProject): V2WorkspaceCardData {
  const override = CARD_OVERRIDES[project.id];
  const lifecycle = override?.lifecycle ?? defaultLifecycle(project);
  const changeCount = override?.changeCount ?? (project.id.startsWith('proj-v2-') ? 1 : 0);
  const changeItemKeys =
    override?.changeItemKeys ??
    (changeCount > 0 ? ['grantAdded'] : []);
  const aiPmSummaryKey = override?.aiPmSummaryKey ?? defaultSummaryKey(project);

  return {
    project,
    lifecycle,
    changeCount,
    changeItemKeys,
    aiPmSummaryKey,
  };
}

export function markV2ReturningUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(V2_RETURNING_KEY, '1');
}

export function isV2ReturningUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(V2_RETURNING_KEY) === '1';
}

/** Display name — mock projects already use product names in V2. */
export function getHomeDisplayName(project: MockProject): string {
  return project.name;
}
