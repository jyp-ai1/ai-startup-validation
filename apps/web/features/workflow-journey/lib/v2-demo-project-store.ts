export const DEMO_PROJECT_DRAFT_KEY = 'll_demo_project_draft';
export const DEMO_PROJECT_DRAFT_COOKIE = 'll_demo_project_draft';

import type {
  SmartIntakeFieldId,
  SmartIntakeImportSource,
  SmartIntakeMissingId,
  SmartIntakePricingChoice,
} from './v2-smart-intake-types';

export type DemoWorkflowSnapshot = {
  lastDemoStep?: string;
  founderMemo?: string;
  strategySummary?: string;
  smartAnswers?: Record<string, string>;
  reasonChainSummary?: string;
  artifactDraft?: string;
};

export type DemoProjectDraft = {
  serviceName: string;
  tagline: string;
  customer: string;
  problem: string;
  pastedContent?: string;
  importSource?: SmartIntakeImportSource;
  fileName?: string;
  pricingModel?: SmartIntakePricingChoice;
  priceLevel?: string;
  completenessScore?: number;
  extracted?: Partial<Record<SmartIntakeFieldId, boolean>>;
  missing?: SmartIntakeMissingId[];
  workflow?: DemoWorkflowSnapshot;
};

export const DEMO_WORKFLOW_SNAPSHOT_KEY = 'll_demo_workflow_snapshot';

export function createEmptyDemoProjectDraft(): DemoProjectDraft {
  return { serviceName: '', tagline: '', customer: '', problem: '' };
}

export function isDemoProjectDraftValid(draft: DemoProjectDraft): boolean {
  return draft.serviceName.trim().length >= 2 && draft.tagline.trim().length >= 4;
}

export function saveDemoProjectDraft(draft: DemoProjectDraft): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DEMO_PROJECT_DRAFT_KEY, JSON.stringify(draft));
}

export function loadDemoProjectDraft(): DemoProjectDraft | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(DEMO_PROJECT_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DemoProjectDraft;
    if (!parsed.serviceName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDemoProjectDraftForLogin(draft: DemoProjectDraft): void {
  saveDemoProjectDraft(draft);
  if (typeof document === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify(draft));
  document.cookie = `${DEMO_PROJECT_DRAFT_COOKIE}=${value}; path=/; max-age=3600; SameSite=Lax`;
}

export function saveDemoWorkflowSnapshot(snapshot: DemoWorkflowSnapshot): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DEMO_WORKFLOW_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

export function loadDemoWorkflowSnapshot(): DemoWorkflowSnapshot | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(DEMO_WORKFLOW_SNAPSHOT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DemoWorkflowSnapshot;
  } catch {
    return null;
  }
}

export function clearDemoWorkflowSnapshot(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(DEMO_WORKFLOW_SNAPSHOT_KEY);
}

export function clearDemoProjectDraftCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${DEMO_PROJECT_DRAFT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

export function parseDemoProjectDraftCookie(raw: string | undefined): DemoProjectDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as DemoProjectDraft;
    if (!isDemoProjectDraftValid(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
