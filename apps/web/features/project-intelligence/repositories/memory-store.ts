import type { ProjectMemoryEntry } from '@repo/db';

const STORE_KEY = '__launchlens_project_memory_store__';

type StoreState = {
  entries: Map<string, ProjectMemoryEntry[]>;
};

function getStore(): StoreState {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: StoreState };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = { entries: new Map() };
  }
  return g[STORE_KEY]!;
}

export async function getMemoriesFromStore(projectId: string): Promise<ProjectMemoryEntry[]> {
  const list = getStore().entries.get(projectId);
  return list ? structuredClone(list) : [];
}

export async function saveMemoriesToStore(
  projectId: string,
  entries: ProjectMemoryEntry[],
): Promise<void> {
  getStore().entries.set(projectId, structuredClone(entries));
}

export async function upsertMemoryInStore(entry: ProjectMemoryEntry): Promise<ProjectMemoryEntry> {
  const store = getStore();
  const list = store.entries.get(entry.projectId) ?? [];
  const index = list.findIndex((item) => item.id === entry.id);
  const next = [...list];
  if (index >= 0) {
    next[index] = structuredClone(entry);
  } else {
    next.unshift(structuredClone(entry));
  }
  store.entries.set(entry.projectId, next);
  return structuredClone(entry);
}
