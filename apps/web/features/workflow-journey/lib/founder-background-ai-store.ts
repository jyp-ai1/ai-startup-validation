import type { OvernightInvestigationSnapshot } from './founder-background-ai';

const STORAGE_KEY = 'll_founder_background_ai_v1';

export function loadOvernightSnapshot(projectId: string): OvernightInvestigationSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const all = JSON.parse(raw) as Record<string, OvernightInvestigationSnapshot>;
    return all[projectId] ?? null;
  } catch {
    return null;
  }
}

export function saveOvernightSnapshot(snapshot: OvernightInvestigationSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, OvernightInvestigationSnapshot>) : {};
    all[snapshot.projectId] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // non-blocking
  }
}

export function shouldRunOvernightSync(projectId: string): boolean {
  const snapshot = loadOvernightSnapshot(projectId);
  const today = new Date().toISOString().slice(0, 10);
  return !snapshot || snapshot.runDate !== today;
}
