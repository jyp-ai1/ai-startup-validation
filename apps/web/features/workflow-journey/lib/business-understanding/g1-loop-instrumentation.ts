import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

/** G1 — Core loop instrumentation events (Feature Freeze: logs only). */
export type G1LoopEventName =
  | 'reading_start'
  | 'reading_end'
  | 'thinking_reveal'
  | 'question_show'
  | 'answer_submit'
  | 'learning_show'
  | 'recognition_show'
  | 'pause'
  | 'resume';

export type G1LoopEvent = {
  event: G1LoopEventName;
  timestamp: string;
  workspace?: string;
  turn?: number;
  duration?: number;
  issueId?: AiPmLoopIssueId | null;
  phase?: string;
};

const STORAGE_KEY = 'launchlens:g1:instrumentation';

function readBuffer(): G1LoopEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as G1LoopEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBuffer(events: G1LoopEvent[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

/** Append one loop event — for G1 Instrumentation Log evidence. */
export function logG1LoopEvent(
  input: Omit<G1LoopEvent, 'timestamp'> & { timestamp?: string },
): G1LoopEvent {
  const entry: G1LoopEvent = {
    ...input,
    timestamp: input.timestamp ?? new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const next = [...readBuffer(), entry];
    writeBuffer(next);
    if (process.env.NODE_ENV === 'development') {
      console.info('[G1 Instrumentation]', entry);
    }
  }

  return entry;
}

export function readG1InstrumentationLog(): G1LoopEvent[] {
  return readBuffer();
}

export function exportG1InstrumentationLogJson(): string {
  return JSON.stringify(readBuffer(), null, 2);
}

export function clearG1InstrumentationLog(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Resolve workspace label for walkthrough correlation. */
export function g1WorkspaceLabel(projectId?: string | null): string {
  if (!projectId || projectId === 'demo') return 'demo';
  return projectId;
}
