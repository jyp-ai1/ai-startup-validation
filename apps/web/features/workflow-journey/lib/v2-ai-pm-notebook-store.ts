export type AiPmNotebookEntry = {
  id: string;
  reviewRound: number;
  createdAt: string;
  aiFindings: string[];
  aiMemo: string;
  founderMemo: string;
};

const STORAGE_KEY = 'launchlens:ai-pm-notebook';

function storageKey(projectId?: string): string {
  const scope = projectId ?? 'default';
  return `${STORAGE_KEY}:${scope}`;
}

export function loadAiPmNotebook(projectId?: string): AiPmNotebookEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiPmNotebookEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistNotebook(entries: AiPmNotebookEntry[], projectId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(entries));
}

export function getLatestNotebook(projectId?: string): AiPmNotebookEntry | null {
  const entries = loadAiPmNotebook(projectId);
  return entries[0] ?? null;
}

export function getLatestFounderMemo(projectId?: string): string | null {
  const latest = getLatestNotebook(projectId);
  const memo = latest?.founderMemo.trim();
  return memo ? memo : null;
}

export function createNotebookFromReview(
  reviewRound: number,
  aiFindings: string[],
  aiMemo: string,
  projectId?: string,
): AiPmNotebookEntry {
  const entry: AiPmNotebookEntry = {
    id: `nb_${Date.now()}`,
    reviewRound,
    createdAt: new Date().toISOString(),
    aiFindings,
    aiMemo,
    founderMemo: '',
  };
  const existing = loadAiPmNotebook(projectId).filter((e) => e.reviewRound !== reviewRound);
  persistNotebook([entry, ...existing], projectId);
  return entry;
}

export function saveFounderMemo(
  entryId: string,
  founderMemo: string,
  projectId?: string,
): void {
  const entries = loadAiPmNotebook(projectId).map((e) =>
    e.id === entryId ? { ...e, founderMemo } : e,
  );
  persistNotebook(entries, projectId);
}
