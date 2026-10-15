import { chmodSync, closeSync, existsSync, openSync } from 'node:fs';

import { DatabaseSync } from 'node:sqlite';

import type { ExecutionLedgerEntry } from './execution-ledger';
import { createSimulatedLedgerLog, foldLedgerLog, proposeCrashRecovery, type LedgerLogRecord } from './ledger-recovery';
import {
  acceptanceAlignment,
  acceptanceCounts,
  billableSendCount,
  createApprovalStore,
  type AcceptanceSeal,
} from './ledger-storage-contract';

export const DISK_STORE_KIND = 'sqlite_file' as const;

/** Published Korean privacy page. It does not set an erasure window. */
export const PUBLISHED_PRIVACY_BODY =
  'ALABOM은 사용자 데이터를 존중합니다. 프로젝트 정보는 Workspace에 저장되며 제3자에게 판매되지 않습니다. Sprint L2 인증 출시 전 전체 Privacy Policy가 게시됩니다.';

export const DISK_PRIVACY_REVIEW = {
  publishedBody: PUBLISHED_PRIVACY_BODY,
  publishedNamesErasureDays: false,
  proposedErasureDaysStatus: 'unconfirmed',
  erasureImplemented: false,
  routeMounted: false,
  keyAdded: false,
  productionDatabase: false,
} as const;

const SCHEMA = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
CREATE TABLE IF NOT EXISTS ledger_events (
  event_id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  calls_opened INTEGER NOT NULL CHECK (calls_opened IN (0, 1)),
  network_called INTEGER NOT NULL CHECK (network_called IN (0, 1)),
  entry_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS acceptance_seals (
  execution_id TEXT PRIMARY KEY,
  commit_id TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL UNIQUE,
  acceptance_id TEXT NOT NULL,
  verified_fact INTEGER NOT NULL CHECK (verified_fact = 0),
  judgment_changed INTEGER NOT NULL CHECK (judgment_changed = 0),
  recorded_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES ledger_events(event_id)
);
`;

export type LedgerDisk = {
  kind: typeof DISK_STORE_KIND;
  filePath: string;
  productionDatabase: false;
  close: () => void;
};

type Sql = InstanceType<typeof DatabaseSync>;

export function openLedgerDisk(filePath: string): LedgerDisk & { db: Sql } {
  protect(filePath);
  const db = new DatabaseSync(filePath);
  db.exec(SCHEMA);
  protect(filePath);
  return {
    kind: DISK_STORE_KIND,
    filePath,
    productionDatabase: false,
    db,
    close: () => {
      db.close();
      protect(filePath);
    },
  };
}

export function appendDiskEvent(
  db: Sql,
  eventId: string,
  entry: ExecutionLedgerEntry,
  at: string,
): { wrote: boolean; reason: string | null } {
  if (hasEvent(db, eventId)) return { wrote: false, reason: null };
  if (entry.phase === 'in_progress' && !entry.retryApproval && openedSlots(db, entry.providerId) >= 1) {
    return { wrote: false, reason: 'retry_refused' };
  }
  return transaction(db, () => {
    insertEvent(db, eventId, entry, at);
    return { wrote: true, reason: null };
  });
}

export function commitDiskPair(
  db: Sql,
  eventId: string,
  entry: ExecutionLedgerEntry,
  seal: AcceptanceSeal,
  fault?: 'throw_before_commit',
): { persisted: boolean; wrote: boolean; reason: string | null } {
  if (entry.phase !== 'accepted') return { persisted: false, wrote: false, reason: 'phase_not_accepted' };
  if (seal.eventId !== eventId || seal.executionId !== entry.executionId) {
    return { persisted: false, wrote: false, reason: 'seal_mismatch' };
  }
  if (seal.verifiedFact !== false || seal.judgmentChanged !== false) {
    return { persisted: false, wrote: false, reason: 'judgment_flag' };
  }
  if (hasEvent(db, eventId) || hasSeal(db, seal.executionId)) {
    return { persisted: false, wrote: false, reason: null };
  }
  return transaction(db, () => {
    insertEvent(db, eventId, entry, seal.at);
    insertSeal(db, seal);
    if (fault === 'throw_before_commit') throw new Error('forced rollback before commit');
    return { persisted: true, wrote: true, reason: null };
  });
}

export function crashBeforeDiskCommit(db: Sql, eventId: string, entry: ExecutionLedgerEntry, at: string): never {
  db.exec('BEGIN IMMEDIATE');
  insertEvent(db, eventId, entry, at);
  process.kill(process.pid, 'SIGKILL');
  throw new Error('process should already be dead');
}

export function recoverDisk(db: Sql, now: string): { wrote: boolean; reason: string | null } {
  return transaction(db, () => {
    const view = readView(db);
    const proposed = proposeCrashRecovery(view.ledger, now);
    let wrote = false;
    for (const entry of proposed.entries) {
      const current = view.ledger.entries.find((item) => item.executionId === entry.executionId);
      if (!current || current.phase === entry.phase) continue;
      const eventId = `evt-recover-${entry.executionId}`;
      if (hasEvent(db, eventId)) continue;
      insertEvent(db, eventId, entry, now);
      wrote = true;
    }
    return { wrote, reason: wrote ? null : null };
  });
}

export function insertPhaseWithoutSeal(db: Sql, eventId: string, entry: ExecutionLedgerEntry, at: string) {
  insertEvent(db, eventId, entry, at);
}

export function insertSealWithoutPhase(db: Sql, seal: AcceptanceSeal) {
  db.exec('PRAGMA foreign_keys = OFF');
  insertSeal(db, seal);
  db.exec('PRAGMA foreign_keys = ON');
}

export function readDisk(db: Sql) {
  const view = readView(db);
  const executionIds = [
    ...new Set([
      ...view.ledger.entries.map((entry) => entry.executionId),
      ...view.seals.map((seal) => seal.executionId),
    ]),
  ];
  return {
    kind: DISK_STORE_KIND,
    memoryFixture: false,
    productionDatabase: false,
    eventCount: view.records.filter((record) => record.type === 'entry').length,
    eventIds: view.records.filter((record) => record.type === 'entry').map((record) => record.eventId),
    executionIds,
    phases: view.ledger.entries.map((entry) => ({
      executionId: entry.executionId,
      phase: entry.phase,
      callsOpened: entry.callsOpened,
      networkCalled: entry.networkCalled,
      failureReason: entry.failureReason,
      unconfirmedReason: entry.unconfirmedReason,
      claim: entry.response?.claim ?? entry.request.claim,
    })),
    sealCount: view.seals.length,
    alignments: executionIds.map((executionId) => ({
      executionId,
      alignment: acceptanceAlignment(view.store, executionId),
      counted: acceptanceCounts(view.store, executionId),
    })),
    billableSendCount: billableSendCount(view.store),
    logs: view.ledger.entries.map((entry) => ({
      executionId: entry.executionId,
      providerId: entry.providerId,
      phase: entry.phase,
      callsOpened: entry.callsOpened,
      networkCalled: entry.networkCalled,
      persisted: true,
    })),
    journeyMutated: false,
  };
}

export function journeyAfterDiskCommit<T>(current: T, next: T, persisted: boolean): T {
  return persisted ? next : current;
}

function readView(db: Sql) {
  const records: LedgerLogRecord[] = db
    .prepare('SELECT event_id, entry_json, recorded_at FROM ledger_events ORDER BY rowid')
    .all()
    .map((row) => ({
      type: 'entry' as const,
      eventId: String(row.event_id),
      entry: JSON.parse(String(row.entry_json)) as ExecutionLedgerEntry,
      at: String(row.recorded_at),
    }));
  const seals: AcceptanceSeal[] = db
    .prepare(
      'SELECT commit_id, event_id, acceptance_id, execution_id, recorded_at FROM acceptance_seals ORDER BY rowid',
    )
    .all()
    .map((row) => ({
      commitId: String(row.commit_id),
      eventId: String(row.event_id),
      acceptanceId: String(row.acceptance_id),
      executionId: String(row.execution_id),
      verifiedFact: false as const,
      judgmentChanged: false as const,
      at: String(row.recorded_at),
    }));
  const ledger = foldLedgerLog(createSimulatedLedgerLog(records));
  const store = { ...createApprovalStore(createSimulatedLedgerLog(records)), seals };
  return { records, seals, ledger, store };
}

function insertEvent(db: Sql, eventId: string, entry: ExecutionLedgerEntry, at: string) {
  db.prepare(
    `INSERT INTO ledger_events
      (event_id, execution_id, phase, calls_opened, network_called, entry_json, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    eventId,
    entry.executionId,
    entry.phase,
    entry.callsOpened,
    entry.networkCalled ? 1 : 0,
    JSON.stringify(entry),
    at,
  );
}

function insertSeal(db: Sql, seal: AcceptanceSeal) {
  db.prepare(
    `INSERT INTO acceptance_seals
      (execution_id, commit_id, event_id, acceptance_id, verified_fact, judgment_changed, recorded_at)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
  ).run(seal.executionId, seal.commitId, seal.eventId, seal.acceptanceId, seal.at);
}

function hasEvent(db: Sql, eventId: string) {
  return Boolean(db.prepare('SELECT event_id FROM ledger_events WHERE event_id = ?').get(eventId));
}

function hasSeal(db: Sql, executionId: string) {
  return Boolean(db.prepare('SELECT execution_id FROM acceptance_seals WHERE execution_id = ?').get(executionId));
}

function openedSlots(db: Sql, providerId: string) {
  return readView(db).ledger.entries.filter((entry) => entry.providerId === providerId && entry.callsOpened === 1).length;
}

function transaction<T>(db: Sql, work: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const value = work();
    db.exec('COMMIT');
    return value;
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* already closed */
    }
    if (error instanceof Error && error.message === 'forced rollback before commit') {
      return { persisted: false, wrote: false, reason: 'rolled_back' } as T;
    }
    const message = error instanceof Error ? error.message : 'store rejected';
    if (message.includes('UNIQUE') || message.includes('constraint')) {
      return { persisted: false, wrote: false, reason: 'constraint' } as T;
    }
    throw error;
  }
}

function protect(filePath: string) {
  for (const path of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (!existsSync(path) && path === filePath) {
      const fd = openSync(path, 'a', 0o600);
      closeSync(fd);
    }
    if (existsSync(path)) chmodSync(path, 0o600);
  }
}
