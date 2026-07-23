import type { OnboardingContext } from '../types';

const STORE_KEY = '__launchlens_onboarding_store__';

type StoreState = {
  sessions: Map<string, OnboardingContext>;
};

function getStore(): StoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: StoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { sessions: new Map() };
  }
  return g[STORE_KEY]!;
}

export async function getOnboardingFromMemory(projectId: string): Promise<OnboardingContext | null> {
  const session = getStore().sessions.get(projectId);
  return session ? structuredClone(session) : null;
}

export async function saveOnboardingToMemory(
  projectId: string,
  context: OnboardingContext,
): Promise<void> {
  getStore().sessions.set(projectId, structuredClone(context));
}
