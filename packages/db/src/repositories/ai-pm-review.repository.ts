import { getServiceClient } from '../adapters/supabase/service';
import { assertNoError } from '../adapters/supabase/repositories/repository.utils';

/**
 * Durable AI PM review rows in the existing Supabase project.
 * Migration: packages/db/src/migration/023_ai_pm_reviews.sql.
 * The review API uses this repository when the Supabase service role is configured.
 * record_json holds the plan text, review sections, and feedback. It must not hold an API key.
 * deleteForUser removes that user's feedback and reviews. auth.users deletion also cascades.
 */

const REVIEWS = 'ai_pm_reviews';
const FEEDBACK = 'ai_pm_feedback';

export type AiPmReviewRow = {
  userId: string;
  reviewId: string;
  inputSha: string;
  version: number;
  parentReviewId: string | null;
  sourceFeedbackId: string | null;
  supplementSha: string | null;
  status: 'succeeded' | 'failed' | 'not_run';
  recordJson: Record<string, unknown>;
  finishedAt: string;
};

export type AiPmFeedbackRow = {
  userId: string;
  feedbackId: string;
  reviewId: string;
  recordJson: Record<string, unknown>;
  submittedAt: string;
};

type ReviewSqlRow = {
  user_id: string;
  review_id: string;
  input_sha: string;
  version: number;
  parent_review_id: string | null;
  source_feedback_id: string | null;
  supplement_sha: string | null;
  status: AiPmReviewRow['status'];
  record_json: Record<string, unknown>;
  finished_at: string;
};

type FeedbackSqlRow = {
  user_id: string;
  feedback_id: string;
  review_id: string;
  record_json: Record<string, unknown>;
  submitted_at: string;
};

function toReview(row: ReviewSqlRow): AiPmReviewRow {
  return {
    userId: row.user_id,
    reviewId: row.review_id,
    inputSha: row.input_sha,
    version: row.version,
    parentReviewId: row.parent_review_id,
    sourceFeedbackId: row.source_feedback_id,
    supplementSha: row.supplement_sha,
    status: row.status,
    recordJson: row.record_json,
    finishedAt: row.finished_at,
  };
}

function toFeedback(row: FeedbackSqlRow): AiPmFeedbackRow {
  return {
    userId: row.user_id,
    feedbackId: row.feedback_id,
    reviewId: row.review_id,
    recordJson: row.record_json,
    submittedAt: row.submitted_at,
  };
}

export class SupabaseAiPmReviewRepository {
  async insertReview(row: AiPmReviewRow): Promise<{ wrote: boolean }> {
    const client = getServiceClient();
    const { error } = await client.from(REVIEWS).insert({
      user_id: row.userId,
      review_id: row.reviewId,
      input_sha: row.inputSha,
      version: row.version,
      parent_review_id: row.parentReviewId,
      source_feedback_id: row.sourceFeedbackId,
      supplement_sha: row.supplementSha,
      status: row.status,
      record_json: row.recordJson,
      finished_at: row.finishedAt,
    });
    if (error?.code === '23505') return { wrote: false };
    assertNoError(error);
    return { wrote: true };
  }

  async insertFeedback(row: AiPmFeedbackRow): Promise<{ wrote: boolean }> {
    const client = getServiceClient();
    const { error } = await client.from(FEEDBACK).insert({
      user_id: row.userId,
      feedback_id: row.feedbackId,
      review_id: row.reviewId,
      record_json: row.recordJson,
      submitted_at: row.submittedAt,
    });
    if (error?.code === '23505') return { wrote: false };
    assertNoError(error);
    return { wrote: true };
  }

  async readReview(userId: string, reviewId: string): Promise<AiPmReviewRow | null> {
    const client = getServiceClient();
    const { data, error } = await client
      .from(REVIEWS)
      .select('*')
      .eq('user_id', userId)
      .eq('review_id', reviewId)
      .maybeSingle();
    assertNoError(error);
    return data ? toReview(data as ReviewSqlRow) : null;
  }

  async latestForInput(userId: string, inputSha: string): Promise<AiPmReviewRow | null> {
    const client = getServiceClient();
    const { data, error } = await client
      .from(REVIEWS)
      .select('*')
      .eq('user_id', userId)
      .eq('input_sha', inputSha)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();
    assertNoError(error);
    return data ? toReview(data as ReviewSqlRow) : null;
  }

  async succeededChild(
    userId: string,
    parentReviewId: string,
    sourceFeedbackId: string | null,
    supplementSha: string,
  ): Promise<AiPmReviewRow | null> {
    const client = getServiceClient();
    let query = client
      .from(REVIEWS)
      .select('*')
      .eq('user_id', userId)
      .eq('parent_review_id', parentReviewId)
      .eq('supplement_sha', supplementSha)
      .eq('status', 'succeeded');
    query = sourceFeedbackId
      ? query.eq('source_feedback_id', sourceFeedbackId)
      : query.is('source_feedback_id', null);
    const { data, error } = await query.limit(1).maybeSingle();
    assertNoError(error);
    return data ? toReview(data as ReviewSqlRow) : null;
  }

  async deleteForUser(userId: string): Promise<void> {
    const client = getServiceClient();
    const feedback = await client.from(FEEDBACK).delete().eq('user_id', userId);
    assertNoError(feedback.error);
    const reviews = await client.from(REVIEWS).delete().eq('user_id', userId);
    assertNoError(reviews.error);
  }

  async listReviews(userId: string): Promise<AiPmReviewRow[]> {
    const client = getServiceClient();
    const { data, error } = await client
      .from(REVIEWS)
      .select('*')
      .eq('user_id', userId)
      .order('finished_at', { ascending: true })
      .order('version', { ascending: true });
    assertNoError(error);
    return ((data ?? []) as ReviewSqlRow[]).map(toReview);
  }

  async listFeedback(userId: string, reviewId?: string): Promise<AiPmFeedbackRow[]> {
    const client = getServiceClient();
    let query = client.from(FEEDBACK).select('*').eq('user_id', userId).order('submitted_at', { ascending: true });
    if (reviewId) query = query.eq('review_id', reviewId);
    const { data, error } = await query;
    assertNoError(error);
    return ((data ?? []) as FeedbackSqlRow[]).map(toFeedback);
  }
}

export const aiPmReviewRepository = new SupabaseAiPmReviewRepository();
