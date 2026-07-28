import { getActiveProjectId, legacyDecisionMemoryKey } from '@/lib/project/project-context-store';

import type { V2ValidationEvidence } from './v2-validation-store';
import { isEvidenceFieldFilled } from './v2-validation-store';

export type DecisionMemoryStatus = 'current' | 'superseded';

export type DecisionMemoryEntry = {
  id: string;
  decision: string;
  reason: string;
  evidence: string[];
  decidedAt: string;
  status: DecisionMemoryStatus;
};

export type DecisionMemoryDraft = {
  decision: string;
  reason: string;
  evidence: string[];
};

function resolveProjectId(projectId?: string): string {
  if (projectId) return projectId;
  const active = getActiveProjectId();
  if (!active) {
    throw new Error('Decision memory requires active projectId');
  }
  return active;
}

function storageKey(projectId?: string): string {
  return legacyDecisionMemoryKey(resolveProjectId(projectId));
}

export function loadDecisionMemory(projectId?: string): DecisionMemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DecisionMemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDecisionMemory(entries: DecisionMemoryEntry[], projectId?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(projectId), JSON.stringify(entries));
}

export function getCurrentDecision(entries: DecisionMemoryEntry[]): DecisionMemoryEntry | null {
  return entries.find((e) => e.status === 'current') ?? null;
}

export function buildDraftFromReview(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): DecisionMemoryDraft | null {
  if (!isEvidenceFieldFilled('idea', evidence) || reviewCount < 1) return null;

  const evidenceItems: string[] = [];
  if (reviewCount > 0) evidenceItems.push('marketResearch');
  if (isEvidenceFieldFilled('customer', evidence)) evidenceItems.push('interviews');
  if (reviewCount > 0) evidenceItems.push('competitors');
  if (isEvidenceFieldFilled('problem', evidence)) evidenceItems.push('problemInput');
  if (isEvidenceFieldFilled('pricing', evidence)) evidenceItems.push('pricingInput');

  const reasonParts: string[] = [];
  if (evidence.problem?.trim()) reasonParts.push('problem');
  if (evidence.customer?.trim()) reasonParts.push('customer');
  if (reviewCount > 0) reasonParts.push('market');

  return {
    decision: evidence.idea.trim(),
    reason: reasonParts.length > 0 ? reasonParts.join('+') : 'initialReview',
    evidence: evidenceItems,
  };
}

export function commitDecisionEntry(
  decision: string,
  reason: string,
  evidence: string[],
  projectId?: string,
): DecisionMemoryEntry {
  const entries = loadDecisionMemory(projectId);
  const now = new Date().toISOString();

  const next: DecisionMemoryEntry = {
    id: `dm_${Date.now()}`,
    decision,
    reason,
    evidence,
    decidedAt: now,
    status: 'current',
  };

  const updated = entries.map((entry) =>
    entry.status === 'current' ? { ...entry, status: 'superseded' as const } : entry,
  );

  saveDecisionMemory([next, ...updated], projectId);
  return next;
}

export function formatDecisionDate(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function decisionNavLabel(entry: DecisionMemoryEntry, maxLen = 22): string {
  const text = entry.decision.trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
}
