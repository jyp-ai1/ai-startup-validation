import type { AiPmAgendaId, DecisionChoice, SessionPhase } from './v2-ai-pm-decision-types';

const STORAGE_KEY = 'launchlens:ai-pm-decision-session';

export type StoredDecisionSession = {
  agendaId: AiPmAgendaId;
  phase: SessionPhase;
  choice: DecisionChoice | null;
  closedAt: string | null;
};

function storageKey(projectId?: string): string {
  return `${STORAGE_KEY}:${projectId ?? 'default'}`;
}

export function loadDecisionSession(projectId?: string): StoredDecisionSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    return JSON.parse(raw) as StoredDecisionSession;
  } catch {
    return null;
  }
}

function persistSession(session: StoredDecisionSession, projectId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(session));
}

export function getSessionPhase(agendaId: AiPmAgendaId, projectId?: string): SessionPhase {
  const stored = loadDecisionSession(projectId);
  if (!stored || stored.agendaId !== agendaId) return 'brief';
  return stored.phase;
}

export function startDecisionSession(agendaId: AiPmAgendaId, projectId?: string): void {
  persistSession({ agendaId, phase: 'session', choice: null, closedAt: null }, projectId);
}

export function saveDecisionChoice(
  agendaId: AiPmAgendaId,
  choice: DecisionChoice,
  projectId?: string,
): void {
  persistSession({ agendaId, phase: 'session', choice, closedAt: null }, projectId);
}

export function finalizeMeetingClosed(agendaId: AiPmAgendaId, projectId?: string): void {
  const stored = loadDecisionSession(projectId);
  persistSession(
    {
      agendaId,
      phase: 'closed',
      choice: stored?.choice ?? null,
      closedAt: new Date().toISOString(),
    },
    projectId,
  );
}

/** @deprecated use saveDecisionChoice + finalizeMeetingClosed */
export function closeDecisionSession(
  agendaId: AiPmAgendaId,
  choice: DecisionChoice,
  projectId?: string,
): void {
  saveDecisionChoice(agendaId, choice, projectId);
}

export function resetDecisionSession(projectId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(projectId));
}

export function getDecisionChoice(projectId?: string): DecisionChoice | null {
  return loadDecisionSession(projectId)?.choice ?? null;
}
