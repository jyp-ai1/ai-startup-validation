const STORAGE_PREFIX = 'll_founder_inbox_reviewed';

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}:${projectId}`;
}

export function loadReviewedInboxIds(projectId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function markInboxItemReviewed(projectId: string, itemId: string): void {
  if (typeof window === 'undefined') return;
  const current = loadReviewedInboxIds(projectId);
  current.add(itemId);
  sessionStorage.setItem(storageKey(projectId), JSON.stringify([...current]));
}

export function clearReviewedInbox(projectId: string): void {
  sessionStorage.removeItem(storageKey(projectId));
}
