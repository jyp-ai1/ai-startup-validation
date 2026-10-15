import type { StoredSource } from './citation-reconciliation';
import type { AnalysisExecutionRequest } from './execution-contract';
import {
  acceptExecution,
  failExecution,
  markExecutionUnconfirmed,
  receiveExecutionResponse,
  registerExecution,
  startExecution,
  type ExecutionLedger,
  type ExecutionLedgerEntry,
  type LedgerNotice,
  type LedgerPhase,
} from './execution-ledger';
import type { JourneyState } from './journey-types';

/**
 * In-memory simulation of a ledger log.
 * kind, restartedProcess, and durableVerified stay fixed so a passing test
 * cannot be reported as a real process restart or a durable store.
 */
export const SIMULATION_ASSURANCE = {
  storeKind: 'in_memory_simulation',
  restartedProcess: false,
  durableVerified: false,
} as const;

export type SimulationAssurance = typeof SIMULATION_ASSURANCE;

export const RECOVERY_SCENARIOS = [
  {
    id: 'registered_before_call',
    recoveredPhase: 'registered',
    automaticRetry: false,
    preserve: '등록 이벤트',
  },
  {
    id: 'slot_without_confirmed_send',
    recoveredPhase: 'unconfirmed',
    automaticRetry: false,
    preserve: 'callsOpened 와 networkCalled 를 각각 유지',
  },
  {
    id: 'response_before_acceptance',
    recoveredPhase: 'response_received',
    automaticRetry: false,
    preserve: '보관된 응답 본문',
  },
  {
    id: 'accepted_redelivery',
    recoveredPhase: 'accepted',
    automaticRetry: false,
    preserve: '수용된 첫 항목',
  },
  {
    id: 'store_write_failure',
    recoveredPhase: 'previous',
    automaticRetry: false,
    preserve: '쓰기 직전 로그',
  },
  {
    id: 'provider_arrival_order',
    recoveredPhase: 'per_execution',
    automaticRetry: false,
    preserve: '두 제공자의 항목',
  },
  {
    id: 'duplicate_execution_id',
    recoveredPhase: 'first_record',
    automaticRetry: false,
    preserve: '같은 ID의 첫 기록',
  },
] as const;

export type LedgerLogRecord =
  | { type: 'entry'; eventId: string; entry: ExecutionLedgerEntry; at: string }
  | { type: 'notice'; notice: LedgerNotice };

export type SimulatedLedgerLog = {
  kind: 'in_memory_simulation';
  records: LedgerLogRecord[];
  failWrites: number;
};

const STORE_REJECTED = '저장소가 기록을 받지 않았다. 이번 전이를 성공으로 보지 않는다.';

export function createSimulatedLedgerLog(records: LedgerLogRecord[] = []): SimulatedLedgerLog {
  return { kind: 'in_memory_simulation', records: [...records], failWrites: 0 };
}

export function armSimulatedWriteFailure(log: SimulatedLedgerLog, count: number): SimulatedLedgerLog {
  return { ...log, failWrites: count };
}

export function isLegalLedgerTransition(from: LedgerPhase, to: LedgerPhase): boolean {
  if (from === 'registered' && to === 'in_progress') return true;
  if (from === 'in_progress' && (to === 'failed' || to === 'unconfirmed' || to === 'response_received')) return true;
  if (from === 'response_received' && to === 'accepted') return true;
  return false;
}

export function foldLedgerLog(log: SimulatedLedgerLog): ExecutionLedger {
  const entries: ExecutionLedgerEntry[] = [];
  const notices: LedgerNotice[] = [];
  for (const record of log.records) {
    if (record.type === 'notice') {
      notices.push(record.notice);
      continue;
    }
    const index = entries.findIndex((entry) => entry.executionId === record.entry.executionId);
    if (index < 0) {
      entries.push(record.entry);
      continue;
    }
    const current = entries[index];
    if (!current || !isLegalLedgerTransition(current.phase, record.entry.phase)) {
      notices.push({
        executionId: record.entry.executionId,
        kind: 'duplicate_found',
        reason: '같은 실행 ID의 나중 기록은 첫 기록을 바꾸지 않는다.',
        at: record.at,
      });
      continue;
    }
    entries[index] = record.entry;
  }
  return { entries, notices };
}

export function proposeCrashRecovery(ledger: ExecutionLedger, now: string): ExecutionLedger {
  let next = ledger;
  for (const entry of ledger.entries) {
    if (entry.phase !== 'in_progress') continue;
    const reason = entry.networkCalled
      ? '전송 기록은 있으나 응답이 없다. 자동 재호출하지 않는다.'
      : '호출 슬롯은 열렸으나 전송 여부는 기록되지 않았다. callsOpened는 HTTP 호출이 아니다. 자동 재호출하지 않는다.';
    next = markExecutionUnconfirmed(next, entry.executionId, reason, now).ledger;
  }
  return next;
}

type CommitResult = SimulationAssurance & {
  persisted: boolean;
  wrote: boolean;
  log: SimulatedLedgerLog;
  ledger: ExecutionLedger;
  reason: string | null;
};

export function recordRegistration(
  log: SimulatedLedgerLog,
  request: AnalysisExecutionRequest,
  now: string,
  options?: { retryApproval?: boolean },
): CommitResult & { duplicate: boolean; entry: ExecutionLedgerEntry | null } {
  const before = foldLedgerLog(log);
  const registered = registerExecution(before, request, now, options);
  const committed = commitDelta(log, before, registered.ledger, now);
  return {
    ...committed,
    duplicate: registered.duplicate,
    entry: committed.persisted ? (foldLedgerLog(committed.log).entries.find((entry) => entry.executionId === request.executionId) ?? null) : null,
    ledger: committed.persisted ? foldLedgerLog(committed.log) : before,
  };
}

export function recordSlot(
  log: SimulatedLedgerLog,
  executionId: string,
  now: string,
): CommitResult & { opened: boolean; entry: ExecutionLedgerEntry | null } {
  const before = foldLedgerLog(log);
  const started = startExecution(before, executionId, now);
  const committed = commitDelta(log, before, started.ledger, now);
  const ledger = committed.persisted ? foldLedgerLog(committed.log) : before;
  return {
    ...committed,
    opened: committed.persisted && started.opened,
    entry: ledger.entries.find((entry) => entry.executionId === executionId) ?? null,
    ledger,
  };
}

export function recordFailure(
  log: SimulatedLedgerLog,
  executionId: string,
  reason: string,
  now: string,
): CommitResult & { entry: ExecutionLedgerEntry | null } {
  const before = foldLedgerLog(log);
  const failed = failExecution(before, executionId, reason, now);
  const committed = commitDelta(log, before, failed.ledger, now);
  const ledger = committed.persisted ? foldLedgerLog(committed.log) : before;
  return {
    ...committed,
    ledger,
    entry: ledger.entries.find((entry) => entry.executionId === executionId) ?? null,
  };
}

export function recordResponse(
  log: SimulatedLedgerLog,
  executionId: string,
  response: AnalysisExecutionRequest,
  now: string,
): CommitResult & { stored: boolean; entry: ExecutionLedgerEntry | null } {
  const before = foldLedgerLog(log);
  const received = receiveExecutionResponse(before, executionId, response, now);
  const committed = commitDelta(log, before, received.ledger, now);
  const ledger = committed.persisted ? foldLedgerLog(committed.log) : before;
  return {
    ...committed,
    stored: committed.persisted && received.stored,
    ledger,
    entry: ledger.entries.find((entry) => entry.executionId === executionId) ?? null,
  };
}

export function recordAcceptance(
  log: SimulatedLedgerLog,
  state: JourneyState,
  executionId: string,
  now: string,
  sources?: StoredSource[],
): CommitResult & { accepted: boolean; state: JourneyState; entry: ExecutionLedgerEntry | null } {
  const before = foldLedgerLog(log);
  const accepted = acceptExecution(state, before, executionId, now, sources);
  const committed = commitDelta(log, before, accepted.ledger, now);
  if (!committed.persisted) {
    return {
      ...committed,
      accepted: false,
      state,
      ledger: before,
      entry: before.entries.find((entry) => entry.executionId === executionId) ?? null,
    };
  }
  const ledger = foldLedgerLog(committed.log);
  return {
    ...committed,
    accepted: accepted.accepted,
    state: accepted.accepted ? accepted.state : state,
    ledger,
    entry: ledger.entries.find((entry) => entry.executionId === executionId) ?? null,
  };
}

export function recordRecovery(log: SimulatedLedgerLog, now: string): CommitResult & { proposed: ExecutionLedger } {
  const before = foldLedgerLog(log);
  const proposed = proposeCrashRecovery(before, now);
  const committed = commitDelta(log, before, proposed, now);
  return {
    ...committed,
    proposed,
    ledger: committed.persisted ? foldLedgerLog(committed.log) : before,
  };
}

function commitDelta(log: SimulatedLedgerLog, before: ExecutionLedger, after: ExecutionLedger, now: string): CommitResult {
  const records = deltaRecords(log, before, after, now);
  if (records.length === 0) {
    return seal({ persisted: false, wrote: false, log, ledger: before, reason: null });
  }
  if (log.failWrites > 0) {
    return seal({
      persisted: false,
      wrote: false,
      log: { ...log, failWrites: log.failWrites - 1 },
      ledger: before,
      reason: STORE_REJECTED,
    });
  }
  const next = { ...log, records: [...log.records, ...records] };
  return seal({ persisted: true, wrote: true, log: next, ledger: foldLedgerLog(next), reason: null });
}

function deltaRecords(log: SimulatedLedgerLog, before: ExecutionLedger, after: ExecutionLedger, now: string): LedgerLogRecord[] {
  const records: LedgerLogRecord[] = [];
  for (const entry of after.entries) {
    const previous = before.entries.find((item) => item.executionId === entry.executionId);
    if (previous === entry) continue;
    records.push({
      type: 'entry',
      eventId: `evt-${log.records.length + records.length + 1}`,
      entry,
      at: now,
    });
  }
  for (const notice of after.notices.slice(before.notices.length)) {
    records.push({ type: 'notice', notice });
  }
  return records;
}

function seal<T extends object>(value: T): T & SimulationAssurance {
  return { ...value, ...SIMULATION_ASSURANCE };
}
