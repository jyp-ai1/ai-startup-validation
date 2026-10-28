import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  aiPmReviewRepository,
  isSupabaseAdminConfigured,
  type AiPmFeedbackRow,
  type AiPmReviewRow,
} from '@repo/db';

import {
  AI_PM_REVIEW_STORAGE,
  SUPABASE_REVIEW_STORAGE,
  openAiPmReviewStore,
  type AiPmReviewStore,
  type ReviewStorageReport,
  type StoredFeedback,
  type StoredReview,
} from './ai-pm-review-store';

export type AiPmDurablePort = {
  insertReview: (row: AiPmReviewRow) => Promise<{ wrote: boolean }>;
  insertFeedback: (row: AiPmFeedbackRow) => Promise<{ wrote: boolean }>;
  readReview: (userId: string, reviewId: string) => Promise<AiPmReviewRow | null>;
  latestForInput: (userId: string, inputSha: string, projectId: string) => Promise<AiPmReviewRow | null>;
  succeededChild: (
    userId: string,
    parentReviewId: string,
    sourceFeedbackId: string | null,
    supplementSha: string,
  ) => Promise<AiPmReviewRow | null>;
  listReviews: (userId: string, projectId: string) => Promise<AiPmReviewRow[]>;
  deleteForProject: (userId: string, projectId: string) => Promise<void>;
  listFeedback: (userId: string, reviewId?: string) => Promise<AiPmFeedbackRow[]>;
  deleteForUser: (userId: string) => Promise<void>;
};

export function chooseReviewBackend(input: {
  adminConfigured: boolean;
  openSqlite: () => AiPmReviewStore;
  openSupabase: () => AiPmReviewStore;
}): { store: AiPmReviewStore; storage: ReviewStorageReport } {
  const store = input.adminConfigured ? input.openSupabase() : input.openSqlite();
  return { store, storage: store.durable ? SUPABASE_REVIEW_STORAGE : AI_PM_REVIEW_STORAGE };
}

export function openReviewBackend(): { store: AiPmReviewStore; storage: ReviewStorageReport } {
  return chooseReviewBackend({
    adminConfigured: isSupabaseAdminConfigured(),
    openSqlite: () => {
      const filePath = process.env.AI_PM_REVIEW_DB_PATH?.trim() || join(process.cwd(), '.data', 'ai-pm-reviews.sqlite');
      mkdirSync(join(filePath, '..'), { recursive: true });
      return openAiPmReviewStore(filePath);
    },
    openSupabase: () => openSupabaseReviewStore(aiPmReviewRepository),
  });
}

export function openSupabaseReviewStore(port: AiPmDurablePort): AiPmReviewStore {
  return {
    filePath: null,
    durable: true,
    productionDatabase: true,
    insertReview: (record) => port.insertReview(toReviewRow(record)),
    insertFeedback: (record) => port.insertFeedback(toFeedbackRow(record)),
    readReview: async (userId, reviewId) => asReview(userId, await port.readReview(userId, reviewId)),
    latestForInput: async (userId, inputSha, projectId) =>
      asReview(userId, await port.latestForInput(userId, inputSha, projectId)),
    succeededChild: async (userId, parentReviewId, sourceFeedbackId, supplementSha) =>
      asReview(userId, await port.succeededChild(userId, parentReviewId, sourceFeedbackId, supplementSha)),
    listReviews: async (userId, projectId) =>
      (await port.listReviews(userId, projectId)).flatMap((row) => {
        const record = asReview(userId, row);
        return record ? [record] : [];
      }),
    listFeedback: async (userId, reviewId) =>
      (await port.listFeedback(userId, reviewId)).flatMap((row) => {
        const record = asFeedback(userId, row);
        return record ? [record] : [];
      }),
    deleteOwnedRecords: (userId) => port.deleteForUser(userId),
    deleteForProject: (userId, projectId) => port.deleteForProject(userId, projectId),
    close: () => undefined,
  };
}

function toReviewRow(record: StoredReview): AiPmReviewRow {
  return {
    userId: record.userId,
    reviewId: record.reviewId,
    projectId: record.projectId,
    inputSha: record.inputSha,
    version: record.version,
    parentReviewId: record.parentReviewId,
    sourceFeedbackId: record.sourceFeedbackId,
    supplementSha: record.supplementSha,
    status: record.status,
    recordJson: { ...record },
    finishedAt: record.finishedAt,
  };
}

function toFeedbackRow(record: StoredFeedback): AiPmFeedbackRow {
  return {
    userId: record.userId,
    feedbackId: record.feedbackId,
    reviewId: record.reviewId,
    recordJson: { ...record },
    submittedAt: record.submittedAt,
  };
}

function asReview(userId: string, row: AiPmReviewRow | null): StoredReview | null {
  if (!row || row.userId !== userId) return null;
  const record = row.recordJson as StoredReview;
  if (record.userId !== userId || record.reviewId !== row.reviewId) return null;
  return { ...record, projectId: row.projectId };
}

function asFeedback(userId: string, row: AiPmFeedbackRow): StoredFeedback | null {
  if (row.userId !== userId) return null;
  const record = row.recordJson as StoredFeedback;
  if (record.userId !== userId || record.feedbackId !== row.feedbackId) return null;
  return record;
}
