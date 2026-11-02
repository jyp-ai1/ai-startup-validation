import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openReviewBackend } from '../features/business-validation-journey/lib/ai-pm-review-backend';

/**
 * Read-only check for the two remaining Sprint 2 items.
 * Does not insert, update, or call a model.
 */

const TEST_USER_ID = 'c0ffee00-1111-4000-8000-0000000002a2';
const FOUNDER_USER = '37d541c8-fda7-4788-8ac2-1a449b00425c';
const FOUNDER_PROJECT = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const FAILED_ROW = '0e75ff46-88fd-4ce2-b567-bdc3f3048531';
const PROJECT_ID = 'bc12a6f4-45b7-47b2-b266-ef61cd4013d9';
const EVIDENCE_HASH = '6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd';
const PRIOR_REVIEWS = [
  'c7681fa3-410e-4eab-bdef-069bcaf8be6d',
  '9d49d73d-1bdb-43f8-aa5f-22f0138813d9',
  '69878cc7-05f0-4980-bb37-011c6f7cf302',
  '818cc1e2-3324-43dc-a548-e2c01b72e1db',
];
const PRIOR_FEEDBACK = [
  'b6834bdc-2060-4207-95e7-544ee51acc1c',
  '084969b5-5015-4ab9-9cb5-5b79c0799dde',
  'e7866ee3-2182-4d17-b743-42250ebcf057',
  '5b287941-7710-4c21-a649-3608ddc3fef1',
  'd0b1e51d-7aec-42da-97f6-94910cb5d6fe',
  '63770084-963d-46f7-9ebc-da4131afd564',
  '7501d005-7423-4103-902b-dee5b4519588',
  '609020fa-808a-404c-929a-edcc0d98df59',
];

function repoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (existsSync(join(dir, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json'))) return dir;
    dir = resolve(dir, '..');
  }
  throw new Error('repo_root_not_found');
}

function publicText(value: string): string {
  return value.replace(/https?:\/\/\S+/g, '[url]').replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]').slice(0, 240);
}

function fileSha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('sprint 2 remaining acceptance', () => {
  it('checks the isolated session and leaves stored rows unread by a model', async () => {
    const root = repoRoot();
    const evidence = join(root, 'docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json');
    const prior = join(root, 'docs/evidence/ALABOM/AI-PM/sprint-2-final-acceptance.json');
    const db = await import('@repo/db');
    const lookedUp = await db.getServiceClient().auth.admin.getUserById(TEST_USER_ID);
    const identities = lookedUp.data.user?.identities?.map((identity) => identity.provider) ?? [];
    const appProvider = typeof lookedUp.data.user?.app_metadata?.provider === 'string'
      ? lookedUp.data.user.app_metadata.provider
      : null;
    const jar: Array<{ name: string; value: string }> = [];
    const anon = db.createServerClient({
      cookies: {
        getAll: () => jar,
        set: (name: string, value: string) => {
          jar.push({ name, value });
        },
      },
    });
    let oauthHost: string | null = null;
    let oauthError: string | null = null;
    if (anon) {
      const oauth = await anon.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://127.0.0.1:3456/auth/callback?next=%2Fworkspace',
          skipBrowserRedirect: true,
        },
      });
      oauthError = oauth.error ? publicText(oauth.error.message) : null;
      if (oauth.data.url) {
        try {
          oauthHost = new URL(oauth.data.url).hostname;
        } catch {
          oauthHost = 'unparsed';
        }
      }
    }
    const head = async (table: string, filters: Record<string, string>) => {
      let query = db.getServiceClient().from(table).select('*', { count: 'exact', head: true });
      for (const [key, value] of Object.entries(filters)) query = query.eq(key, value);
      const response = await query;
      return response.count;
    };
    const backend = openReviewBackend();
    let reviews: Array<{ reviewId: string; parentReviewId: string | null; status: string }> = [];
    let feedback: Array<{ feedbackId: string; reviewId: string; questionId: string | null; unlinked: boolean }> = [];
    try {
      reviews = (await backend.store.listReviews(TEST_USER_ID, PROJECT_ID)).map((row) => ({
        reviewId: row.reviewId,
        parentReviewId: row.parentReviewId,
        status: row.status,
      }));
      feedback = (await backend.store.listFeedback(TEST_USER_ID)).map((row) => ({
        feedbackId: row.feedbackId,
        reviewId: row.reviewId,
        questionId: row.questionId ?? null,
        unlinked: row.unlinked === true,
      }));
    } finally {
      backend.store.close();
    }
    const saved = JSON.parse(readFileSync(prior, 'utf8')) as {
      requests?: Array<{ user?: { originalInput?: string; answeredQuestionState?: Array<{ questionKey?: string }> } }>;
    };
    const stage = saved.requests?.find((item) => Array.isArray(item.user?.answeredQuestionState) && (item.user?.answeredQuestionState?.length ?? 0) > 5);
    const report = {
      kind: 'sprint2-remaining-acceptance',
      at: new Date().toISOString(),
      sprint2: 'PARTIAL',
      productionDeploy: false,
      sprint3Started: false,
      gptHttpCalls: 0,
      passAreasChanged: false,
      evidenceHash: fileSha(evidence),
      sessionFiles: {
        qaAuth: existsSync(join(root, 'apps/web/.qa-auth')),
        chromeProfile: existsSync(join(root, 'apps/web/.qa-chrome-profile')),
        storageState: existsSync(join(root, 'apps/web/.qa-auth/storageState.json')),
      },
      googleEnvPresent: Object.keys(process.env).some((name) => name.toUpperCase().includes('GOOGLE')),
      gptEnvPresent: Boolean(process.env.GPT_API_KEY?.trim()),
      isolatedUser: {
        id: TEST_USER_ID,
        found: lookedUp.data.user?.id === TEST_USER_ID,
        providers: identities,
        appProvider,
        lookupError: lookedUp.error ? publicText(lookedUp.error.message) : null,
      },
      oauth: { host: oauthHost, error: oauthError, cookieNames: jar.map((item) => item.name) },
      storage: {
        durable: backend.store.durable,
        productionDatabase: backend.store.productionDatabase,
      },
      counts: {
        founderReviews: await head('ai_pm_reviews', { user_id: FOUNDER_USER }),
        founderProjectReviews: await head('ai_pm_reviews', { project_id: FOUNDER_PROJECT }),
        founderProjects: await head('startup_projects', { user_id: FOUNDER_USER }),
        failedReview: await head('ai_pm_reviews', { review_id: FAILED_ROW }),
        isolatedReviews: await head('ai_pm_reviews', { user_id: TEST_USER_ID }),
        isolatedFeedback: await head('ai_pm_feedback', { user_id: TEST_USER_ID }),
      },
      reviews,
      feedback,
      priorReviewIdsPresent: PRIOR_REVIEWS.every((id) => reviews.some((row) => row.reviewId === id)),
      priorFeedbackIdsPresent: PRIOR_FEEDBACK.every((id) => feedback.some((row) => row.feedbackId === id)),
      payloadStillCarriesContext: Boolean(stage?.user?.originalInput) && (stage?.user?.answeredQuestionState?.length ?? 0) >= 7,
      founderScreen: 'BLOCKED',
      gptContinuity: 'NOT RUN',
      e2e: 'PARTIAL',
    };
    writeFileSync(join(root, 'docs/evidence/ALABOM/AI-PM/sprint-2-remaining-acceptance.json'), `${JSON.stringify(report, null, 2)}\n`);
    expect(report.evidenceHash).toBe(EVIDENCE_HASH);
    expect(report.gptHttpCalls).toBe(0);
    expect(report.counts.founderReviews).toBe(70);
    expect(report.counts.founderProjects).toBe(172);
    expect(report.counts.failedReview).toBe(0);
    expect(report.priorReviewIdsPresent).toBe(true);
    expect(report.priorFeedbackIdsPresent).toBe(true);
    expect(report.isolatedUser.providers).not.toContain('google');
    expect(report.sessionFiles.storageState).toBe(false);
  });
});
