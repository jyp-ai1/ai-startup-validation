import type { GapCompleteness, StateTransition } from './contracts';

/** Allowed gap completeness transitions (ground-truth engine). */
const ALLOWED: Record<GapCompleteness, GapCompleteness[]> = {
  OPEN: ['PARTIAL', 'CLOSED', 'ASSUMPTION', 'INFERENCE', 'UNKNOWN'],
  PARTIAL: ['CLOSED', 'OPEN', 'CONFLICT'],
  CLOSED: ['CONFLICT', 'OPEN'],
  CONFLICT: ['OPEN', 'PARTIAL', 'CLOSED'],
  UNKNOWN: ['PARTIAL', 'OPEN', 'ASSUMPTION'],
  ASSUMPTION: ['PARTIAL', 'INFERENCE', 'OPEN'],
  INFERENCE: ['ASSUMPTION', 'PARTIAL'],
};

export function canTransition(from: GapCompleteness, to: GapCompleteness): boolean {
  if (from === to) return true;
  return ALLOWED[from]?.includes(to) ?? false;
}

export function appendTransition(
  log: StateTransition[],
  t: StateTransition,
): StateTransition[] {
  if (!canTransition(t.from, t.to)) {
    return [
      ...log,
      { ...t, to: 'CONFLICT' as GapCompleteness, trigger: 'system' },
    ];
  }
  return [...log, t];
}

/** Correction: old fact superseded → new fact (slot may reopen). */
export function correctionTransition(slot: string): StateTransition[] {
  return [
    { slot, from: 'CLOSED', to: 'CONFLICT', trigger: 'correction' },
    { slot, from: 'CONFLICT', to: 'PARTIAL', trigger: 'correction' },
  ];
}
