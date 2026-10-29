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
  project_id TEXT,
  status TEXT NOT NULL,
  record_json TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  PRIMARY KEY (user_id, review_id)
);
CREATE INDEX IF NOT EXISTS ai_pm_reviews_input
  ON ai_pm_reviews (user_id, project_id, input_sha, version);
CREATE TABLE IF NOT EXISTS ai_pm_feedback (
  user_id TEXT NOT NULL,
  feedback_id TEXT NOT NULL,
  review_id TEXT NOT NULL,
  record_json TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (user_id, feedback_id)
);
`;

/**
 * Local sqlite is the test-environment record.
 * On Vercel the function filesystem is read-only except ephemeral /tmp.
 * A file under process.cwd()/.data is not kept across instances or redeploys.
 * durable:false means this file is not the production database.
 * The durable tables are migration 023_ai_pm_reviews.sql. That migration is not applied.
 */
export const AI_PM_REVIEW_STORAGE = {
  kind: 'local_sqlite' as const,
  durable: false as const,
  productionDatabase: false as const,
  migration: null,
  pathEnv: 'AI_PM_REVIEW_DB_PATH',
  defaultPath: '.data/ai-pm-reviews.sqlite',
};

export type ReviewStorageReport = {
  kind: 'local_sqlite' | 'supabase';
  durable: boolean;
  productionDatabase: boolean;
  migration: '023_ai_pm_reviews.sql' | null;
};

export const SUPABASE_REVIEW_STORAGE: ReviewStorageReport = {
  kind: 'supabase',
  durable: true,
  productionDatabase: true,
  migration: '023_ai_pm_reviews.sql',
};

export type AiPmReviewStore = {
  filePath: string | null;
  durable: boolean;
  productionDatabase: boolean;
  insertReview: (record: StoredReview) => Promise<{ wrote: boolean }>;
  insertFeedback: (record: StoredFeedback) => Promise<{ wrote: boolean }>;
  readReview: (userId: string, reviewId: string) => Promise<StoredReview | null>;
  latestForInput: (userId: string, inputSha: string, projectId: string) => Promise<StoredReview | null>;
  succeededChild: (
    userId: string,
    parentReviewId: string,
    sourceFeedbackId: string | null,
    supplementSha: string,
  ) => Promise<StoredReview | null>;
  listReviews: (userId: string, projectId: string) => Promise<StoredReview[]>;
  /** Local mirror of the project hard-delete cascade. Postgres uses the foreign key. */
  deleteForProject: (userId: string, projectId: string) => Promise<void>;
  listFeedback: (userId: string, reviewId?: string) => Promise<StoredFeedback[]>;
  deleteOwnedRecords: (userId: string) => Promise<void>;
  close: () => void;
};

export type RevisionGateFailure =
  | 'confirmed_reuse'
  | 'confirmation_unset'
  | 'discarded_interpretation'
  | 'missing_core_not_asked'
  | 'question_unchanged'
  | 'invented_core';

export type ClaimConfirmationState = 'unconfirmed' | 'confirmed';

export type ClaimConfirmation = {
  problem: ClaimConfirmationState | null;
  customer: ClaimConfirmationState | null;
  revenue: ClaimConfirmationState | null;
};

export type RevisionGate = {
  pass: boolean;
  summary: string;
  changes: string[];
  failures: RevisionGateFailure[];
};

export type StoredReview = {
  reviewId: string;
  userId: string;
  version: number;
  parentReviewId: string | null;
  sourceFeedbackId: string | null;
  supplementSha: string | null;
  projectId: string | null;
  inputSha: string;
  inputText: string;
  inputOrigin: 'typed' | 'file' | 'file_and_typed';
  fileName: string | null;
  status: 'succeeded' | 'failed' | 'not_run';
  evidence: 'live_network' | 'injected_http' | 'not_run';
  provider: 'openai' | 'google' | null;
  model: string | null;
  sections: ReviewSections | null;
  rawContent: string | null;
  /** Set when a follow-up was compared with the previous review. Absent on older rows. */
  revisionGate?: RevisionGate | null;
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

export type ReviewChoice = {
  id: string;
  label: string;
};

/** First-review business reading. Absent on rows stored before this contract. */
export type BusinessAnalysis = {
  summary: string;
  value: string;
  operatingModel: string;
  payer: string;
  competition: string;
  operations: string;
  profitability: string;
  strengths: string[];
  assumptions: string[];
  evidenceToChange: string[];
  founderFacts: string[];
  inferences: string[];
  judgmentDetail: string;
  choices: ReviewChoice[];
};

export type ChoiceAnswer = {
  choiceId: string;
  label: string;
  otherText: string;
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
  nextQuestion: string;
  nextQuestionReason: string;
  answerHint: string;
  /** Explicit confirmation for the problem, customer, and revenue claims. Null on a first review. */
  claimConfirmation: ClaimConfirmation | null;
  /** Set when the first review returned a business analysis and choices. */
  analysis?: BusinessAnalysis | null;
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

export type ReviewMark =
  | 'understanding_accurate'
  | 'understanding_wrong'
  | 'core_missing'
  | 'unnecessary'
  | 'evidence_unclear'
  | 'question_unfit';

export type StoredFeedback = {
  feedbackId: string;
  reviewId: string;
  userId: string;
  agreement: Agreement;
  accuracy: Accuracy;
  revisionAreas: RevisionArea[];
  comment: string;
  nextAction: NextAction;
  marks: ReviewMark[];
  /** Founder's choice on the first question. Saving it does not call a model. */
  choiceAnswer?: ChoiceAnswer | null;
  submittedAt: string;
  modelCalls: 0;
};

type Sql = InstanceType<typeof DatabaseSync>;

export function openAiPmReviewStore(filePath: string): AiPmReviewStore {
  mkdirSync(dirname(filePath), { recursive: true });
  protect(filePath);
  const db = new DatabaseSync(filePath);
  db.exec(SCHEMA);
  ensureProjectColumn(db);
  protect(filePath);
  return {
    filePath,
    durable: false,
    productionDatabase: false,
    insertReview: async (record) => insertReview(db, record),
    insertFeedback: async (record) => insertFeedback(db, record),
    readReview: async (userId, reviewId) => readReview(db, userId, reviewId),
    latestForInput: async (userId, inputSha, projectId) => latestForInput(db, userId, inputSha, projectId),
    succeededChild: async (userId, parentReviewId, sourceFeedbackId, supplementSha) =>
      succeededChild(db, userId, parentReviewId, sourceFeedbackId, supplementSha),
    listReviews: async (userId, projectId) => listReviews(db, userId, projectId),
    listFeedback: async (userId, reviewId) => listFeedback(db, userId, reviewId),
    deleteOwnedRecords: async (userId) => {
      db.prepare('DELETE FROM ai_pm_feedback WHERE user_id = ?').run(userId);
      db.prepare('DELETE FROM ai_pm_reviews WHERE user_id = ?').run(userId);
    },
    deleteForProject: async (userId, projectId) => deleteForProject(db, userId, projectId),
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
        (user_id, review_id, input_sha, version, parent_review_id, project_id, status, record_json, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      record.userId,
      record.reviewId,
      record.inputSha,
      record.version,
      record.parentReviewId,
      record.projectId,
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
    .prepare('SELECT record_json, project_id FROM ai_pm_reviews WHERE user_id = ? AND review_id = ?')
    .get(userId, reviewId) as { record_json?: string; project_id?: string | null } | undefined;
  return row?.record_json ? recordFromRow(row.record_json, row.project_id ?? null) : null;
}

function latestForInput(db: Sql, userId: string, inputSha: string, projectId: string): StoredReview | null {
  const row = db
    .prepare(
      `SELECT record_json, project_id FROM ai_pm_reviews
       WHERE user_id = ? AND project_id = ? AND input_sha = ?
       ORDER BY version DESC LIMIT 1`,
    )
    .get(userId, projectId, inputSha) as { record_json?: string; project_id?: string | null } | undefined;
  return row?.record_json ? recordFromRow(row.record_json, row.project_id ?? null) : null;
}

function succeededChild(
  db: Sql,
  userId: string,
  parentReviewId: string,
  sourceFeedbackId: string | null,
  supplementSha: string,
): StoredReview | null {
  const rows = db
    .prepare('SELECT record_json, project_id FROM ai_pm_reviews WHERE user_id = ? AND parent_review_id = ? AND status = ?')
    .all(userId, parentReviewId, 'succeeded') as Array<{ record_json: string; project_id: string | null }>;
  for (const row of rows) {
    const record = recordFromRow(row.record_json, row.project_id);
    if (record.sourceFeedbackId === sourceFeedbackId && record.supplementSha === supplementSha) {
      return record;
    }
  }
  return null;
}

function listReviews(db: Sql, userId: string, projectId: string): StoredReview[] {
  const rows = db
    .prepare(
      'SELECT record_json, project_id FROM ai_pm_reviews WHERE user_id = ? AND project_id = ? ORDER BY finished_at ASC, version ASC',
    )
    .all(userId, projectId) as Array<{ record_json: string; project_id: string | null }>;
  return rows.map((row) => recordFromRow(row.record_json, row.project_id));
}

function deleteForProject(db: Sql, userId: string, projectId: string) {
  const reviews = db
    .prepare('SELECT review_id FROM ai_pm_reviews WHERE user_id = ? AND project_id = ?')
    .all(userId, projectId) as Array<{ review_id: string }>;
  for (const review of reviews) {
    db.prepare('DELETE FROM ai_pm_feedback WHERE user_id = ? AND review_id = ?').run(userId, review.review_id);
  }
  db.prepare('DELETE FROM ai_pm_reviews WHERE user_id = ? AND project_id = ?').run(userId, projectId);
}

function recordFromRow(recordJson: string, projectId: string | null): StoredReview {
  const record = JSON.parse(recordJson) as StoredReview;
  return { ...record, projectId: projectId ?? record.projectId ?? null };
}

function ensureProjectColumn(db: Sql) {
  const columns = db.prepare('PRAGMA table_info(ai_pm_reviews)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'project_id')) {
    db.exec('ALTER TABLE ai_pm_reviews ADD COLUMN project_id TEXT');
  }
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
