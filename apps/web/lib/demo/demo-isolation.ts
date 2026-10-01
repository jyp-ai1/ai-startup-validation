import type { DemoProjectSlug, DemoRuntimeKind } from './demo-scenario-types';

export const DEMO_MY_BUSINESS_SESSION_KEY = 'launchlens.demo.mybusiness.sessionId';

/** Legacy shared id — do not use for new Sample / My Business sessions. */
export const LEGACY_DEMO_SESSION_PROJECT_ID = 'demo-session';

export function demoSampleProjectId(slug: DemoProjectSlug): string {
  return `demo-sample-${slug}`;
}

export function demoMyBusinessProjectId(sessionId: string): string {
  return `demo-my-${sessionId}`;
}

export function resolveDemoRuntimeKind(input: {
  sampleParam: string | null | undefined;
  isAuthenticatedProject: boolean;
}): DemoRuntimeKind {
  if (input.isAuthenticatedProject) return 'PRODUCTION_PROJECT';
  if (input.sampleParam === 'custom') return 'DEMO_MY_BUSINESS';
  return 'DEMO_SAMPLE';
}

export function normalizeDemoSampleSlug(raw: string | null | undefined): DemoProjectSlug | 'custom' {
  const value = raw?.trim() ?? '';
  if (value === 'custom') return 'custom';
  const legacy: Record<string, DemoProjectSlug> = {
    launchlens: 'clinicflow',
    saas: 'clinicflow',
    fnb: 'local-sns',
    commerce: 'fitbridge',
    manufacturing: 'fitbridge',
    clinicflow: 'clinicflow',
    'local-sns': 'local-sns',
    fitbridge: 'fitbridge',
  };
  return legacy[value] ?? 'clinicflow';
}

export function resolveDemoGuidedProjectId(input: {
  sampleParam: string | null | undefined;
  myBusinessSessionId?: string | null;
}): string {
  const normalized = normalizeDemoSampleSlug(input.sampleParam);
  if (normalized === 'custom') {
    const sessionId =
      input.myBusinessSessionId?.trim() ||
      (typeof window !== 'undefined'
        ? sessionStorage.getItem(DEMO_MY_BUSINESS_SESSION_KEY)?.trim()
        : '') ||
      createMyBusinessSessionId();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DEMO_MY_BUSINESS_SESSION_KEY, sessionId);
    }
    return demoMyBusinessProjectId(sessionId);
  }
  return demoSampleProjectId(normalized);
}

export function createMyBusinessSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 12);
  }
  return `mb-${Date.now().toString(36)}`;
}

export function isDemoSampleProjectId(projectId: string | undefined): boolean {
  return Boolean(projectId?.startsWith('demo-sample-'));
}

export function isDemoMyBusinessProjectId(projectId: string | undefined): boolean {
  return Boolean(projectId?.startsWith('demo-my-'));
}

export function isLegacyDemoSessionProjectId(projectId: string | undefined): boolean {
  return projectId === LEGACY_DEMO_SESSION_PROJECT_ID;
}

export function isDemoGuestProjectId(projectId: string | undefined): boolean {
  return (
    isDemoSampleProjectId(projectId) ||
    isDemoMyBusinessProjectId(projectId) ||
    isLegacyDemoSessionProjectId(projectId)
  );
}

export function demoPlaybackFrameStorageKey(projectId: string): string {
  return `launchlens.demo.playback.${projectId}.frameIndex`;
}

export function demoRuntimeKindStorageKey(projectId: string): string {
  return `launchlens.demo.runtime.${projectId}.kind`;
}
