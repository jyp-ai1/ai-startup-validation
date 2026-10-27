import { chmodSync, closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { DatabaseSync } from 'node:sqlite';

/**
 * Local sqlite file for Gemini round text.
 * Not the production database. Rollback: DROP TABLE gemini_rounds, then delete the file
 * named by GEMINI_ROUND_DB_PATH (and its -wal / -shm siblings).
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS gemini_rounds (
  user_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  round INTEGER NOT NULL CHECK (round IN (1, 2)),
  status TEXT NOT NULL,
  record_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  PRIMARY KEY (user_id, execution_id)
);
`;

export type GeminiRoundEvidence = 'live_network' | 'injected_http' | 'not_run';

export type GeminiRoundStatus = 'succeeded' | 'failed' | 'not_run' | 'result_missing';

export type GeminiRoundRecord = {
  userId: string;
  executionId: string;
  round: 1 | 2;
  parentExecutionId: string | null;
  businessInput: string;
  feedback: string | null;
  prompt: string;
  status: GeminiRoundStatus;
  evidence: GeminiRoundEvidence;
  content: string | null;
  model: string | null;
  requestedAt: string;
  finishedAt: string;
  error: string | null;
  httpStatus: number | null;
  groundingUsed: false;
  sourceUrls: [];
  sourceStatus: 'absent';
  usageKnown: boolean;
  costUsd: null;
  verifiedFact: false;
};

export type GeminiRoundStore = {
  filePath: string;
  productionDatabase: false;
  insert: (record: GeminiRoundRecord) => { wrote: boolean };
  read: (userId: string, executionId: string) => GeminiRoundRecord | null;
  list: (userId: string) => GeminiRoundRecord[];
  close: () => void;
};

type Sql = InstanceType<typeof DatabaseSync>;

export function openGeminiRoundStore(filePath: string): GeminiRoundStore {
  mkdirSync(dirname(filePath), { recursive: true });
  protect(filePath);
  const db = new DatabaseSync(filePath);
  db.exec(SCHEMA);
  protect(filePath);
  return {
    filePath,
    productionDatabase: false,
    insert: (record) => insertRound(db, record),
    read: (userId, executionId) => readRound(db, userId, executionId),
    list: (userId) => listRounds(db, userId),
    close: () => {
      db.close();
      protect(filePath);
    },
  };
}

function insertRound(db: Sql, record: GeminiRoundRecord): { wrote: boolean } {
  if (readRound(db, record.userId, record.executionId)) return { wrote: false };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO gemini_rounds
        (user_id, execution_id, round, status, record_json, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      record.userId,
      record.executionId,
      record.round,
      record.status,
      JSON.stringify(record),
      record.finishedAt,
    );
    db.exec('COMMIT');
    return { wrote: true };
  } catch (error) {
    try {
      db.exec('ROLLBACK');
    } catch {
      /* already closed */
    }
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE') || message.includes('constraint')) return { wrote: false };
    throw error;
  }
}

function readRound(db: Sql, userId: string, executionId: string): GeminiRoundRecord | null {
  const row = db
    .prepare(
      'SELECT record_json FROM gemini_rounds WHERE user_id = ? AND execution_id = ?',
    )
    .get(userId, executionId) as { record_json?: string } | undefined;
  if (!row?.record_json) return null;
  return JSON.parse(row.record_json) as GeminiRoundRecord;
}

function listRounds(db: Sql, userId: string): GeminiRoundRecord[] {
  const rows = db
    .prepare(
      'SELECT record_json FROM gemini_rounds WHERE user_id = ? ORDER BY recorded_at ASC, execution_id ASC',
    )
    .all(userId) as Array<{ record_json: string }>;
  return rows.map((row) => JSON.parse(row.record_json) as GeminiRoundRecord);
}

function protect(filePath: string) {
  for (const target of [filePath, `${filePath}-wal`, `${filePath}-shm`]) {
    if (!existsSync(target) && target === filePath) {
      const fd = openSync(target, 'a', 0o600);
      closeSync(fd);
    }
    if (existsSync(target)) chmodSync(target, 0o600);
  }
}
