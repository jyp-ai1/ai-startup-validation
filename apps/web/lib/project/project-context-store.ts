/**
 * Project-scoped storage + reset — Sprint 5 P0 Hotfix.
 * All workflow state MUST use projectId namespacing; never global bleed.
 */

export const ACTIVE_PROJECT_SESSION_KEY = 'launchlens.activeProjectId';
export const LEGACY_JOURNEY_PROJECT_KEY = 'll_journey_project_id';

const PROJECT_PREFIX = 'launchlens.project.';
const WORKFLOW_PREFIX = 'launchlens.workflow.';
const EVIDENCE_PREFIX = 'launchlens.evidence.';
const REASON_PREFIX = 'launchlens.reason.';

/** Legacy global keys that caused cross-project bleed — cleared on reset/switch. */
const LEGACY_GLOBAL_SESSION_KEYS = [
  'll_v2_validation_evidence',
  'll_v2_validation_options',
  'll_v2_validation_idea',
  'll_v2_validation_score',
  'll_v2_review_snapshot',
  'll_project_registration',
  'll_founder_information_v1',
  'll_founder_micro_answers',
] as const;

const LEGACY_GLOBAL_LOCAL_KEYS = [
  'll_investigation_schedule_hour',
  'll_investigation_schedule_weekdays',
  'll_v2_returning',
  'll_founder_evidence_v1',
  'll_founder_behavior_v1',
  'll_founder_memory_v1',
  'll_founder_background_ai_v1',
  'll_founder_operating_state_v1',
  'll_daily_ceo_approval_v1',
  'll_daily_ceo_queue_v1',
  'll_daily_ceo_overnight_v1',
] as const;

export function projectStorageKey(
  projectId: string,
  domain: 'project' | 'workflow' | 'evidence' | 'reason',
): string {
  const prefix =
    domain === 'project'
      ? PROJECT_PREFIX
      : domain === 'workflow'
        ? WORKFLOW_PREFIX
        : domain === 'evidence'
          ? EVIDENCE_PREFIX
          : REASON_PREFIX;
  return `${prefix}${projectId}`;
}

export function legacyDecisionMemoryKey(projectId: string): string {
  return `ll_v2_decision_memory_${projectId}`;
}

export function workspaceLastVisitKey(projectId: string): string {
  return `launchlens.workspace.lastVisit.${projectId}`;
}

export function getActiveProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    sessionStorage.getItem(ACTIVE_PROJECT_SESSION_KEY) ??
    sessionStorage.getItem(LEGACY_JOURNEY_PROJECT_KEY)
  );
}

export function setActiveProjectId(projectId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ACTIVE_PROJECT_SESSION_KEY, projectId);
  sessionStorage.setItem(LEGACY_JOURNEY_PROJECT_KEY, projectId);
  document.cookie = `ACTIVE_PROJECT_ID=${encodeURIComponent(projectId)}; path=/; max-age=31536000; SameSite=Lax`;
}

function clearKeysForProject(storage: Storage, projectId: string): void {
  const toRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    if (key.includes(projectId)) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((key) => storage.removeItem(key));
}

function clearLegacyGlobalKeys(): void {
  if (typeof window === 'undefined') return;
  for (const key of LEGACY_GLOBAL_SESSION_KEYS) {
    sessionStorage.removeItem(key);
  }
  for (const key of LEGACY_GLOBAL_LOCAL_KEYS) {
    localStorage.removeItem(key);
  }
}

/** Reset all client-side context for a new project — P0-2. */
export function resetProjectContext(projectId: string): void {
  if (typeof window === 'undefined') return;

  clearLegacyGlobalKeys();
  clearKeysForProject(localStorage, projectId);
  clearKeysForProject(sessionStorage, projectId);
  setActiveProjectId(projectId);
}

/** Reset ephemeral demo session — Demo must not share Workspace state. */
export function resetDemoSessionContext(): void {
  if (typeof window === 'undefined') return;
  clearLegacyGlobalKeys();
  sessionStorage.removeItem(LEGACY_JOURNEY_PROJECT_KEY);
  sessionStorage.removeItem(ACTIVE_PROJECT_SESSION_KEY);
}
