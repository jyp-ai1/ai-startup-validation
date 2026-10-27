import { chmodSync, closeSync, existsSync, mkdirSync, openSync } from 'node:fs';
import { dirname } from 'node:path';

import { DatabaseSync } from 'node:sqlite';

/**
 * Local sqlite file for AI PM reviews.
 * Not the production database. Rollback: DROP TABLE ai_pm_reviews and
 * ai_pm_feedback, then delete the file named by AI_PM_REVIEW_DB_PATH
 * (and its -wal / -shm siblings).
 */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS ai_pm_reviews (
  user_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  input_sha TEXT NOT NULL,
  version INTEGER NOT NULL,
  parent_review_id TEXT,
  status TEXT NOT NULL,
  record_json TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  PRIMARY KEY (user_id, review_id)
);
CREATE INDEX IF NOT EXISTS ai_pm_reviews_input
  ON ai_pm_reviews (user_id, input_sha, version);
CREATE TABLE IF NOT EXISTS ai_pm_feedback (
  user_id TEXT NOT NULL,
  feedback_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, feedback_id)
);
`;

export type AiPmReviewStore = {
  filePath: string;
  productionDatabase: false;
  insertReview: (record: StoredReview) => { wrote: boolean };
  insertFeedback: (record: StoredFeedback) => { wrote: boolean };
  readReview: (userId: string, reviewId: string) => StoredReview | null;
  latestForInput: (userId: string, inputSha: string) => StoredReview | null;
  succeededChild: (parentReviewId: string, sourceFeedbackId: string, supplementSha: string) => StoredReview | null;
  listReviews: (userId: string) => StoredReview[];
  listFeedback: (userId: string, reviewId?: string) => StoredFeedback[];
  close: () => void;
};

export type StoredReview = {
  reviewId: string;
  userId: string;
  version: number;
  parentReviewId: string | null;
  sourceFeedbackId: string | null;
  supplementSha: string | null;
  inputSha: string;
  inputText: string;
  inputOrigin: 'typed' | 'file' | 'file_and_typed';
  fileName: string | null;
  status: 'succeeded' | 'failed' | 'not_run';
  evidence: 'live_network' | 'injected_http' | 'not_run';
  provider: 'openai' | null;
  model: string | null;
  sections: ReviewSections | null;
  rawContent: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  usageKnown: boolean;
  callCount: number;
  latencyMs: number | null;
  error: string | null;
  requestedAt: string;
  finishedAt: string;
};

export type ReviewSections = {
  customer: string;
  problem: string;
  market: string;
  revenueModel: string;
  execution: string;
  risks: string[];
  uncertain: string[];
  hypotheses: string[];
  judgment: string;
};

export type Agreement = 'agree' | 'partial' | 'disagree' | 'need_info';
export type Accuracy = 'very_accurate' | 'mostly_accurate' | 'misstated' | 'hard_to_compare';
export type RevisionArea =
  | 'payer'
  | 'problem'
  | 'market'
  | 'revenue'
  | 'execution'
  | 'competition'
  | 'risk'
  | 'evidence'
  | 'other';
export type NextAction =
  | 'verify_hypotheses'
  | 'revise_plan'
  | 'design_interviews'
  | 'proceed'
  | 'hold';

export type StoredFeedback = {
  feedbackId: string;
  reviewId: string;
  userId: string;
  agreement: Agreement;
  accuracy: Accuracy;
  revisionAreas: RevisionArea[];
  comment: string;
  nextAction: NextAction;
  submittedAt: string;
  modelCalls: 0;
};

type Sql = InstanceType<typeof DatabaseSync>;

export function openAiPmReviewStore(filePath: string): AiPmReviewStore {
  mkdirSync(dirname(filePath), { recursive: true });
  protect(filePath);
  const db = new DatabaseSync(filePath);
  db.exec(SCHEMA);
  protect(filePath);
  return {
    filePath,
    productionDatabase: false,
    insertReview: (record) => insertReview(db, record),
    insertFeedback: (record) => insertFeedback(db, record),
    readReview: (userId, reviewId) => readReview(db, userId, reviewId),
    latestForInput: (userId, inputSha) => latestForInput(db, userId, inputSha),
    succeededChild: (parentReviewId, sourceFeedbackId, supplementSha) =>
      succeededChild(db, parentReviewId, sourceFeedbackId, supplementSha),
    listReviews: (userId) => listReviews(db, userId),
    listFeedback: (userId, reviewId) => listFeedback(db, userId, reviewId),
    close: () => {
      db.close();
      protect(filePath);
    },
  };
}

function insertReview(db: Sql, record: StoredReview): { wrote: boolean } {
  if (readReview(db, record.userId, record.reviewId)) return { wrote: false };
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO ai_pm_reviews
        (user_id, review_id, input_sha, version, parent_review_id, status, record_json, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.userId,
      record.reviewId,
      record.inputSha,
      record.version,
      record.parentReviewId,
      record.status,
      JSON.stringify(record),
      record.finishedAt,
    );
    db.exec('COMMIT');
    return { wrote: true };
  } catch (error) {
    rollback(db);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE') || message.includes('constraint')) return { wrote: false };
    throw error;
  }
}

function insertFeedback(db: Sql, record: StoredFeedback): { wrote: boolean } {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(
      `INSERT INTO ai_pm_feedback
        (user_id, feedback_id, review_id, record_json, submitted_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(
      record.userId,
      record.feedbackId,
      record.reviewId,
      JSON.stringify(record),
      record.submittedAt,
    );
    db.exec('COMMIT');
    return { wrote: true };
  } catch (error) {
    rollback(db);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('UNIQUE') || message.includes('constraint')) return { wrote: false };
    throw error;
  }
}

function readReview(db: Sql, userId: string, reviewId: string): StoredReview | null {
  const row = db
    .prepare('SELECT record_json FROM ai_pm_reviews WHERE user_id = ? AND review_id = ?')
    .get(userId, reviewId) as { record_json?: string } | undefined;
  return row?.record_json ? (JSON.parse(row.record_json) as StoredReview) : null;
}

function latestForInput(db: Sql, userId: string, inputSha: string): StoredReview | null {
  const row = db
    .prepare(
      `SELECT record_json FROM ai_pm_reviews
       WHERE user_id = ? AND input_sha = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(userId, inputSha) as { record_json?: string } | undefined;
  return row?.record_json ? (JSON.parse(row.record_json) as StoredReview) : null;
}

function succeededChild(
  db: Sql,
  parentReviewId: string,
  sourceFeedbackId: string,
  supplementSha: string,
): StoredReview | null {
  const rows = db
    .prepare('SELECT record_json FROM ai_pm_reviews WHERE parent_review_id = ? AND status = ?')
    .all(parentReviewId, 'succeeded') as Array<{ record_json: string }>;
  for (const row of rows) {
    const record = JSON.parse(row.record_json) as StoredReview;
    if (record.sourceFeedbackId === sourceFeedbackId && record.supplementSha === supplementSha) {
      return record;
    }
  }
  return null;
}

function listReviews(db: Sql, userId: string): StoredReview[] {
  const rows = db
    .prepare(
      'SELECT record_json FROM ai_pm_reviews WHERE user_id = ? ORDER BY finished_at ASC, version ASC',
    )
    .all(userId) as Array<{ record_json: string }>;
  return rows.map((row) => JSON.parse(row.record_json) as StoredReview);
}

function listFeedback(db: Sql, userId: string, reviewId?: string): StoredFeedback[] {
  const rows = (
    reviewId
      ? db
          .prepare(
            'SELECT record_json FROM ai_pm_feedback WHERE user_id = ? AND review_id = ? ORDER BY submitted_at ASC',
          )
          .all(userId, reviewId)
      : db
          .prepare('SELECT record_json FROM ai_pm_feedback WHERE user_id = ? ORDER BY submitted_at ASC')
          .all(userId)
  ) as Array<{ record_json: string }>;
  return rows.map((row) => JSON.parse(row.record_json) as StoredFeedback);
}

function rollback(db: Sql) {
  try {
    db.exec('ROLLBACK');
  } catch {
    /* already closed */
  }
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
