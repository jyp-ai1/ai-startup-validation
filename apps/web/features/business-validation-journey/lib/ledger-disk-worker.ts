import type { ExecutionLedgerEntry } from './execution-ledger';
import {
  appendDiskEvent,
  commitDiskPair,
  crashBeforeDiskCommit,
  insertPhaseWithoutSeal,
  insertSealWithoutPhase,
  openLedgerDisk,
  readDisk,
  recoverDisk,
} from './ledger-disk-store';
import type { AcceptanceSeal } from './ledger-storage-contract';

type Payload = {
  eventId?: string;
  entry?: ExecutionLedgerEntry;
  at?: string;
  now?: string;
  seal?: AcceptanceSeal;
  fault?: 'throw_before_commit';
};

function run() {
  const file = process.argv[2];
  const command = process.argv[3];
  const encoded = process.argv[4] ?? '';
  const payload = JSON.parse(encoded ? Buffer.from(encoded, 'base64url').toString('utf8') : '{}') as Payload;
  if (!file || !command) {
    console.log(JSON.stringify({ error: 'usage' }));
    process.exit(1);
  }
  const disk = openLedgerDisk(file);
  if (command === 'crash') {
    if (!payload.eventId || !payload.entry || !payload.at) process.exit(1);
    crashBeforeDiskCommit(disk.db, payload.eventId, payload.entry, payload.at);
  }
  const outcome = dispatch(disk.db, command, payload);
  const view = readDisk(disk.db);
  console.error(JSON.stringify({ logs: view.logs }));
  console.log(JSON.stringify({ pid: process.pid, outcome, view }));
  disk.close();
}

function dispatch(db: ReturnType<typeof openLedgerDisk>['db'], command: string, payload: Payload) {
  if (command === 'append') {
    if (!payload.eventId || !payload.entry || !payload.at) return { wrote: false, reason: 'payload' };
    return appendDiskEvent(db, payload.eventId, payload.entry, payload.at);
  }
  if (command === 'commit') {
    if (!payload.eventId || !payload.entry || !payload.seal) return { persisted: false, wrote: false, reason: 'payload' };
    return commitDiskPair(db, payload.eventId, payload.entry, payload.seal, payload.fault);
  }
  if (command === 'recover') return recoverDisk(db, payload.now ?? payload.at ?? '');
  if (command === 'corrupt-phase') {
    if (!payload.eventId || !payload.entry || !payload.at) return { wrote: false, reason: 'payload' };
    insertPhaseWithoutSeal(db, payload.eventId, payload.entry, payload.at);
    return { wrote: true, reason: null };
  }
  if (command === 'corrupt-seal') {
    if (!payload.seal) return { wrote: false, reason: 'payload' };
    insertSealWithoutPhase(db, payload.seal);
    return { wrote: true, reason: null };
  }
  if (command === 'read') return { wrote: false, reason: null };
  return { wrote: false, reason: 'unknown' };
}

if (process.env.LEDGER_DISK_WORKER === '1') run();
