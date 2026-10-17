import { countedExecutionIds } from './analysis-acceptance';
import { acceptExecution, LEDGER_POLICY, redactLedgerEntry, type ExecutionLedgerEntry } from './execution-ledger';
import {
  createSimulatedLedgerLog,
  foldLedgerLog,
  type LedgerLogRecord,
  type SimulatedLedgerLog,
} from './ledger-recovery';
import type { JourneyState } from './journey-types';

/**
 * Approval contract for a future server store.
 * diskVerified and processRestartVerified stay false. This file does not open a database.
 */
export const STORAGE_ASSURANCE = {
  storeKind: 'storage_contract_fixture',
  implemented: false,
  diskVerified: false,
  processRestartVerified: false,
} as const;

export const STORAGE_COMPARISON = [
  {
    id: 'append_only_event_log',
    recommended: true,
    firstRecord: '첫 이벤트는 갱신하지 않는다. 같은 실행 ID의 실패 뒤에 온 성공 이벤트는 로그에 남아도 접기에서 무시한다.',
    atomicity: 'phase 이벤트와 수용 seal 을 같은 commitId 로 쓴다. 덧붙이기만으로 원자성이 생기지는 않는다.',
    duplicateEvent: '같은 eventId 는 다시 추가하지 않는다.',
    outOfOrder: '새 eventId 의 불법 전이는 감사용으로 남기고 접힌 상태는 바꾸지 않는다.',
    partialWrite: '커밋이 거절되면 phase 이벤트와 seal 을 모두 쓰지 않는다.',
  },
  {
    id: 'conditional_row_update',
    recommended: false,
    firstRecord: '한 행을 갱신한다. 조건이 빠지면 첫 실패가 성공으로 바뀐다.',
    atomicity: 'phase 열과 수용 테이블이 서로 다른 쓰기가 되면 불일치가 생긴다.',
    duplicateEvent: 'eventId 가 없으면 같은 갱신을 중복으로 알아보기 어렵다.',
    outOfOrder: '나중 쓰기가 이전 phase 를 덮어쓸 수 있다.',
    partialWrite: '한 테이블만 커밋되면 수용과 실행 상태가 어긋난다.',
  },
] as const;

export const STORAGE_RECOMMENDATION = {
  choice: 'append_only_event_log',
  implemented: false,
  note: '권고는 이벤트 로그와, phase 이벤트·수용 seal 을 한 트랜잭션으로 쓰는 경계다. 이 커밋은 그 저장소를 만들지 않는다.',
} as const;

export const SOURCE_RETENTION_POLICY = {
  status: 'proposal',
  implemented: false,
  access: 'server_service_only',
  founderVisible: ['executionId', 'providerId', 'phase', 'callsOpened', 'networkCalled', 'hypothesisId'],
  storedSensitive: ['founder_source_text', 'model_claim', 'cited_excerpt', 'prompt'],
  logFields: ['executionId', 'providerId', 'phase', 'callsOpened', 'networkCalled', 'persisted'],
  logRedactionIsNotStorageSecurity: true,
  retention: '프로젝트 수명 동안 서버에 둔다. 공개 개인정보 처리방침과 대조하기 전에는 확정 기간이 아니다.',
  erasure: '프로젝트 삭제 또는 창업자 삭제 요청 후 30일 안에 본문을 지운다. 30일은 제안값이다.',
  tombstone: '실행 ID, phase, 제공자, callsOpened, networkCalled, 시각만 남긴다.',
  keys: 'server_only_not_in_ledger',
} as const;

export const COST_APPROVAL = {
  billWhen: 'persisted_network_called_true',
  notBillWhen: 'calls_opened_without_network_called',
  outputTokenCap: LEDGER_POLICY.outputTokenCap,
  priceStatus: LEDGER_POLICY.priceStatus,
  geminiMaxCalls: LEDGER_POLICY.geminiMaxCalls,
  gptMaxCalls: LEDGER_POLICY.gptMaxCalls,
  rerun: '새 실행 ID와 외부 retryApproval 이 있을 때만 다음 슬롯을 연다.',
  unconfirmedRetry: false,
} as const;

export const RESTART_VERIFICATION_PLAN = [
  {
    id: 'restart_after_event',
    procedure: '등록 이벤트를 커밋한 뒤 프로세스를 종료하고 다시 시작한 다음 같은 eventId 를 읽는다.',
    expected: '첫 등록 이벤트가 남고 phase 는 registered, callsOpened 는 0, networkCalled 는 false 다. 복구가 슬롯을 열지 않는다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'interrupt_in_progress',
    procedure: '슬롯 이벤트만 커밋하고 응답 없이 프로세스를 종료한 뒤 다시 시작한다.',
    expected: 'in_progress 는 unconfirmed 가 된다. networkCalled 는 저장값을 유지한다. callsOpened 1 은 비용이 아니다. 자동 재호출은 없다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'interrupt_before_acceptance',
    procedure: 'response_received 를 커밋하고 수용 커밋 전에 프로세스를 종료한 뒤 다시 시작한다.',
    expected: '응답 본문은 남고 seal 은 없다. 복구는 수용하지 않는다. 이후 수용은 그 본문과 seal 을 한 커밋으로 쓴다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'redelivery_after_acceptance',
    procedure: '수용 커밋 이후 같은 eventId 와 같은 응답을 다시 전달한다.',
    expected: '이벤트와 seal 은 늘지 않는다. 수용 집계는 1 이다. 가설과 사업 판단 문장은 그대로다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'write_failure_and_partial',
    procedure: '트랜잭션 거절을 내고, accepted 이벤트와 seal 중 하나만 있는 스냅샷을 각각 읽는다.',
    expected: '거절된 커밋은 이벤트와 seal 이 모두 없다. phase_without_seal 과 seal_without_phase 는 수용으로 세지 않는다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'failure_then_success_same_id',
    procedure: 'failed 이벤트 뒤에 같은 실행 ID의 성공 이벤트를 넣는다.',
    expected: '접힌 phase 는 failed 다. 첫 실패 이벤트가 남는다. 새 호출은 새 실행 ID와 retryApproval 이 있을 때만 슬롯을 연다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
  {
    id: 'recover_unconfirmed',
    procedure: 'unconfirmed 로그를 다시 읽고 복구를 한 번 더 실행한다.',
    expected: '실행 ID 수는 같다. 두 번째 복구는 쓰지 않는다. 승인 없는 새 ID 는 슬롯을 열지 않는다.',
    executed: false,
    diskVerified: false,
    processRestartVerified: false,
  },
] as const;

export type AcceptanceAlignment = 'aligned' | 'phase_without_seal' | 'seal_without_phase' | 'absent';

export type AcceptanceSeal = {
  commitId: string;
  eventId: string;
  acceptanceId: string;
  executionId: string;
  verifiedFact: false;
  judgmentChanged: false;
  at: string;
};

export type ApprovalStore = {
  kind: 'storage_contract_fixture';
  implemented: false;
  diskVerified: false;
  processRestartVerified: false;
  log: SimulatedLedgerLog;
  seals: AcceptanceSeal[];
  failCommits: number;
};

export function createApprovalStore(log: SimulatedLedgerLog = createSimulatedLedgerLog()): ApprovalStore {
  return {
    kind: 'storage_contract_fixture',
    implemented: false,
    diskVerified: false,
    processRestartVerified: false,
    log,
    seals: [],
    failCommits: 0,
  };
}

export function armCommitFailure(store: ApprovalStore, count: number): ApprovalStore {
  return { ...store, failCommits: count };
}

export function acceptanceAlignment(store: ApprovalStore, executionId: string): AcceptanceAlignment {
  const phase = foldLedgerLog(store.log).entries.find((entry) => entry.executionId === executionId)?.phase;
  const seal = store.seals.some((item) => item.executionId === executionId);
  if (phase === 'accepted' && seal) return 'aligned';
  if (phase === 'accepted' && !seal) return 'phase_without_seal';
  if (phase !== 'accepted' && seal) return 'seal_without_phase';
  return 'absent';
}

export function acceptanceCounts(store: ApprovalStore, executionId: string): boolean {
  return acceptanceAlignment(store, executionId) === 'aligned';
}

export function billableSendCount(store: ApprovalStore): number {
  return foldLedgerLog(store.log).entries.filter((entry) => entry.networkCalled).length;
}

export function operationalLog(entry: ExecutionLedgerEntry, persisted: boolean) {
  return { ...redactLedgerEntry(entry), persisted };
}

export function commitStoredAcceptance(
  store: ApprovalStore,
  state: JourneyState,
  executionId: string,
  now: string,
): {
  store: ApprovalStore;
  state: JourneyState;
  persisted: boolean;
  wrote: boolean;
  accepted: boolean;
  alignment: AcceptanceAlignment;
} & typeof STORAGE_ASSURANCE {
  if (store.seals.some((seal) => seal.executionId === executionId)) {
    return assurance({
      store,
      state,
      persisted: false,
      wrote: false,
      accepted: false,
      alignment: acceptanceAlignment(store, executionId),
    });
  }
  const before = foldLedgerLog(store.log);
  const accepted = acceptExecution(state, before, executionId, now);
  if (!accepted.accepted || !accepted.entry) {
    return assurance({
      store,
      state,
      persisted: false,
      wrote: false,
      accepted: false,
      alignment: acceptanceAlignment(store, executionId),
    });
  }
  if (store.failCommits > 0) {
    return assurance({
      store: { ...store, failCommits: store.failCommits - 1 },
      state,
      persisted: false,
      wrote: false,
      accepted: false,
      alignment: 'absent',
    });
  }
  const record = accepted.state.analysisAcceptances.at(-1);
  if (!record) {
    return assurance({
      store,
      state,
      persisted: false,
      wrote: false,
      accepted: false,
      alignment: 'absent',
    });
  }
  const eventId = `evt-accept-${executionId}`;
  const next: ApprovalStore = {
    ...store,
    log: {
      ...store.log,
      records: [...store.log.records, { type: 'entry', eventId, entry: accepted.entry, at: now }],
    },
    seals: [
      ...store.seals,
      {
        commitId: `commit-${executionId}`,
        eventId,
        acceptanceId: record.id,
        executionId,
        verifiedFact: false,
        judgmentChanged: false,
        at: now,
      },
    ],
  };
  return assurance({
    store: next,
    state: accepted.state,
    persisted: true,
    wrote: true,
    accepted: true,
    alignment: acceptanceAlignment(next, executionId),
  });
}

export function replayEvent(store: ApprovalStore, record: LedgerLogRecord): { store: ApprovalStore; wrote: boolean } {
  if (record.type !== 'entry') return { store, wrote: false };
  const seen = store.log.records.some((item) => item.type === 'entry' && item.eventId === record.eventId);
  if (seen) return { store, wrote: false };
  return {
    store: { ...store, log: { ...store.log, records: [...store.log.records, record] } },
    wrote: true,
  };
}

export function dropSeals(store: ApprovalStore): ApprovalStore {
  return { ...store, seals: [] };
}

export function dropAcceptedPhase(store: ApprovalStore, executionId: string): ApprovalStore {
  return {
    ...store,
    log: {
      ...store.log,
      records: store.log.records.filter(
        (record) => !(record.type === 'entry' && record.entry.executionId === executionId && record.entry.phase === 'accepted'),
      ),
    },
  };
}

function assurance<T extends object>(value: T): T & typeof STORAGE_ASSURANCE {
  return { ...value, ...STORAGE_ASSURANCE };
}

export function storedAcceptanceCount(state: JourneyState): string[] {
  return countedExecutionIds(state.analysisAcceptances);
}
