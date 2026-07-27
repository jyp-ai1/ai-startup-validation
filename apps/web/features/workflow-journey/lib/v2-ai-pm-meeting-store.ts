export type AiPmMeetingNote = {
  id: string;
  reviewRound: number;
  meetingDate: string;
  discussedKeys: string[];
  decisionKeys: string[];
  nextAgendaKeys: string[];
  founderMemo: string;
  readAt: string | null;
};

const STORAGE_KEY = 'launchlens:ai-pm-meeting';

function storageKey(projectId?: string): string {
  return `${STORAGE_KEY}:${projectId ?? 'default'}`;
}

export function loadMeetingNotes(projectId?: string): AiPmMeetingNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiPmMeetingNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistNotes(notes: AiPmMeetingNote[], projectId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(notes));
}

export function getLatestMeetingNote(projectId?: string): AiPmMeetingNote | null {
  return loadMeetingNotes(projectId)[0] ?? null;
}

export function getLatestFounderMemo(projectId?: string): string | null {
  const memo = getLatestMeetingNote(projectId)?.founderMemo.trim();
  return memo || null;
}

function formatMeetingDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

export function createMeetingNoteFromReview(
  reviewRound: number,
  projectId?: string,
): AiPmMeetingNote {
  const now = new Date().toISOString();
  const entry: AiPmMeetingNote = {
    id: `mtg_${Date.now()}`,
    reviewRound,
    meetingDate: formatMeetingDate(now),
    discussedKeys: ['marketDemand', 'competitorLandscape', 'customerShift'],
    decisionKeys: ['continuePricingReview'],
    nextAgendaKeys: ['pricingStrategy', 'customerInterviews'],
    founderMemo: '',
    readAt: null,
  };
  const existing = loadMeetingNotes(projectId).filter((e) => e.reviewRound !== reviewRound);
  persistNotes([entry, ...existing], projectId);
  return entry;
}

export function saveFounderMemo(entryId: string, founderMemo: string, projectId?: string): void {
  const notes = loadMeetingNotes(projectId).map((e) =>
    e.id === entryId ? { ...e, founderMemo } : e,
  );
  persistNotes(notes, projectId);
}

export function markMeetingNoteRead(entryId: string, projectId?: string): void {
  const notes = loadMeetingNotes(projectId).map((e) =>
    e.id === entryId ? { ...e, readAt: new Date().toISOString() } : e,
  );
  persistNotes(notes, projectId);
}

/** @deprecated use meeting store */
export {
  createMeetingNoteFromReview as createNotebookFromReview,
  getLatestMeetingNote as getLatestNotebook,
  loadMeetingNotes as loadAiPmNotebook,
};
