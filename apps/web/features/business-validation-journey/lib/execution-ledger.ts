import { admitExecutions, type AnalysisExecutionRequest } from './execution-contract';
import type { StoredSource } from './citation-reconciliation';
import type { JourneyState } from './journey-types';

export type LedgerPhase =
  | 'registered'
  | 'in_progress'
  | 'response_received'
  | 'failed'
  | 'unconfirmed'
  | 'accepted';

export type ExecutionLedgerEntry = {
  executionId: string;
  side: 'gemini' | 'gpt';
  providerId: string;
  phase: LedgerPhase;
  callsOpened: 0 | 1;
  networkCalled: false;
  autoRetry: false;
  retryApproval: boolean;
  request: AnalysisExecutionRequest;
  response: AnalysisExecutionRequest | null;
  failureReason: string | null;
  unconfirmedReason: string | null;
  registeredAt: string;
  updatedAt: string;
};

export type LedgerNotice = {
  executionId: string;
  kind: 'duplicate_delivery' | 'retry_refused' | 'response_mismatch' | 'phase_refused';
  reason: string;
  at: string;
};

export type ExecutionLedger = {
  entries: ExecutionLedgerEntry[];
  notices: LedgerNotice[];
};

export const LEDGER_POLICY = {
  geminiMaxCalls: 1,
  gptMaxCalls: 1,
  outputTokenCap: 1024,
  priceStatus: 'unconfirmed',
  priceMethod: '출력 토큰 수에 제공자 게시 단가를 곱한다. 단가는 요금표 확인 전까지 비어 있다.',
  timeoutMs: 30000,
  autoRetry: false,
  additionalCallOnFailure: false,
  additionalCallOnUnconfirmed: false,
  keyLocation: 'server_only',
  logFields: ['executionId', 'providerId', 'phase', 'callsOpened'],
  rerun: '새 실행 ID와 retryApproval이 있을 때만 다음 호출 슬롯을 연다. 원장은 승인을 만들지 않는다.',
} as const;

export const LEDGER_SCREEN_EMPTY = '실행 원장 없음. 호출을 열지 않았다. 자동 재호출은 하지 않는다.';

export function emptyLedger(): ExecutionLedger {
  return { entries: [], notices: [] };
}

export function registerExecution(
  ledger: ExecutionLedger,
  request: AnalysisExecutionRequest,
  now: string,
  options?: { retryApproval?: boolean },
): { ledger: ExecutionLedger; entry: ExecutionLedgerEntry; duplicate: boolean } {
  const existing = ledger.entries.find((entry) => entry.executionId === request.executionId);
  if (existing) {
    return {
      ledger: notice(ledger, request.executionId, 'duplicate_delivery', '같은 실행 ID는 다시 등록하지 않는다.', now),
      entry: existing,
      duplicate: true,
    };
  }
  const entry: ExecutionLedgerEntry = {
    executionId: request.executionId,
    side: request.purpose === 'research' ? 'gemini' : 'gpt',
    providerId: request.providerId,
    phase: 'registered',
    callsOpened: 0,
    networkCalled: false,
    autoRetry: false,
    retryApproval: options?.retryApproval === true,
    request,
    response: null,
    failureReason: null,
    unconfirmedReason: null,
    registeredAt: now,
    updatedAt: now,
  };
  return { ledger: { ...ledger, entries: [...ledger.entries, entry] }, entry, duplicate: false };
}

export function startExecution(
  ledger: ExecutionLedger,
  executionId: string,
  now: string,
): { ledger: ExecutionLedger; entry: ExecutionLedgerEntry | null; opened: boolean } {
  const entry = findEntry(ledger, executionId);
  if (!entry) return { ledger, entry: null, opened: false };
  if (entry.phase !== 'registered') {
    return {
      ledger: notice(ledger, executionId, 'duplicate_delivery', '이미 열린 실행은 다시 호출하지 않는다.', now),
      entry,
      opened: false,
    };
  }
  const cap = entry.side === 'gemini' ? LEDGER_POLICY.geminiMaxCalls : LEDGER_POLICY.gptMaxCalls;
  const opened = openedCalls(ledger, entry.providerId);
  if (opened >= cap && !entry.retryApproval) {
    return {
      ledger: notice(
        ledger,
        executionId,
        'retry_refused',
        '호출 상한에 도달했다. 실패나 미확정 실행을 자동으로 다시 호출하지 않는다.',
        now,
      ),
      entry,
      opened: false,
    };
  }
  const next = { ...entry, phase: 'in_progress' as const, callsOpened: 1 as const, networkCalled: false as const, updatedAt: now };
  return { ledger: replace(ledger, next), entry: next, opened: true };
}

export function failExecution(
  ledger: ExecutionLedger,
  executionId: string,
  reason: string,
  now: string,
): { ledger: ExecutionLedger; entry: ExecutionLedgerEntry | null } {
  const entry = findEntry(ledger, executionId);
  if (!entry || entry.phase !== 'in_progress') {
    return { ledger: entry ? notice(ledger, executionId, 'phase_refused', '실행 중이 아니면 실패로 기록하지 않는다.', now) : ledger, entry };
  }
  const next = { ...entry, phase: 'failed' as const, failureReason: reason, updatedAt: now };
  return { ledger: replace(ledger, next), entry: next };
}

export function markExecutionUnconfirmed(
  ledger: ExecutionLedger,
  executionId: string,
  reason: string,
  now: string,
): { ledger: ExecutionLedger; entry: ExecutionLedgerEntry | null } {
  const entry = findEntry(ledger, executionId);
  if (!entry || entry.phase !== 'in_progress') {
    return {
      ledger: entry ? notice(ledger, executionId, 'phase_refused', '실행 중 중단만 결과 미확정으로 남긴다.', now) : ledger,
      entry,
    };
  }
  const next = { ...entry, phase: 'unconfirmed' as const, unconfirmedReason: reason, updatedAt: now };
  return { ledger: replace(ledger, next), entry: next };
}

export function receiveExecutionResponse(
  ledger: ExecutionLedger,
  executionId: string,
  response: AnalysisExecutionRequest,
  now: string,
): { ledger: ExecutionLedger; entry: ExecutionLedgerEntry | null; stored: boolean } {
  const entry = findEntry(ledger, executionId);
  if (!entry || entry.phase !== 'in_progress') {
    return {
      ledger: entry ? notice(ledger, executionId, 'duplicate_delivery', '이미 기록된 실행의 응답으로 원장을 덮어쓰지 않는다.', now) : ledger,
      entry,
      stored: false,
    };
  }
  if (response.executionId !== executionId) {
    return {
      ledger: notice(ledger, executionId, 'response_mismatch', '다른 실행의 응답은 수용하지 않는다.', now),
      entry,
      stored: false,
    };
  }
  const next = { ...entry, phase: 'response_received' as const, response, updatedAt: now };
  return { ledger: replace(ledger, next), entry: next, stored: true };
}

export function acceptExecution(
  state: JourneyState,
  ledger: ExecutionLedger,
  executionId: string,
  now: string,
  sources?: StoredSource[],
): {
  state: JourneyState;
  ledger: ExecutionLedger;
  entry: ExecutionLedgerEntry | null;
  accepted: boolean;
} {
  const entry = findEntry(ledger, executionId);
  if (!entry || entry.phase !== 'response_received' || !entry.response) {
    return {
      state,
      ledger: entry ? notice(ledger, executionId, 'phase_refused', '응답이 보관된 실행만 수용한다. 미확정 실행은 다시 호출하지 않는다.', now) : ledger,
      entry,
      accepted: false,
    };
  }
  if (entry.response.executionId !== entry.executionId) {
    return {
      state,
      ledger: notice(ledger, executionId, 'response_mismatch', '다른 실행의 응답은 수용하지 않는다.', now),
      entry,
      accepted: false,
    };
  }
  const admitted = admitExecutions(state, {
    now,
    gemini: entry.side === 'gemini' ? entry.response : null,
    gpt: entry.side === 'gpt' ? entry.response : null,
    sources,
  });
  const next = { ...entry, phase: 'accepted' as const, updatedAt: now };
  return {
    state: admitted.state,
    ledger: replace(ledger, next),
    entry: next,
    accepted: true,
  };
}

export function redactLedgerEntry(entry: ExecutionLedgerEntry) {
  return {
    executionId: entry.executionId,
    providerId: entry.providerId,
    phase: entry.phase,
    callsOpened: entry.callsOpened,
    networkCalled: entry.networkCalled,
  };
}

function findEntry(ledger: ExecutionLedger, executionId: string) {
  return ledger.entries.find((entry) => entry.executionId === executionId) ?? null;
}

function openedCalls(ledger: ExecutionLedger, providerId: string) {
  return ledger.entries.filter((entry) => entry.providerId === providerId && entry.callsOpened === 1).length;
}

function replace(ledger: ExecutionLedger, next: ExecutionLedgerEntry): ExecutionLedger {
  return {
    entries: ledger.entries.map((entry) => (entry.executionId === next.executionId ? next : entry)),
    notices: ledger.notices,
  };
}

function notice(ledger: ExecutionLedger, executionId: string, kind: LedgerNotice['kind'], reason: string, at: string): ExecutionLedger {
  return { ...ledger, notices: [...ledger.notices, { executionId, kind, reason, at }] };
}
